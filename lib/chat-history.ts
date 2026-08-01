import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { chats, documents, messages, sops } from '@/lib/schema';
import {
  citedDocumentIds,
  ownsChat,
  redactRestrictedMessages,
  type ChatOwner,
} from '@/lib/chat-identity';
import type { ChatMessage } from '@/lib/llm';

export const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_CHARACTERS = 2_000;
const MAX_GENERATION_HISTORY_CHARACTERS = 8_000;
const MAX_RETRIEVAL_QUERY_CHARACTERS = 4_000;

interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources: unknown;
}

/**
 * Load model history only from an owned conversation. Browser-supplied history
 * is deliberately not trusted because public chat requests can be modified.
 */
export async function loadModelHistory(
  chatId: string | undefined,
  owner: ChatOwner
): Promise<ChatMessage[]> {
  if (!chatId) return [];

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat || !ownsChat(chat, owner)) return [];

  let history: StoredChatMessage[] = await db
    .select({
      role: messages.role,
      content: messages.content,
      sources: messages.sources,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);

  history.reverse();

  if (owner.kind === 'visitor') {
    const citedIds = history.flatMap((message) => citedDocumentIds(message.sources));
    if (citedIds.length > 0) {
      const restricted = await db
        .select({ id: documents.id })
        .from(documents)
        .innerJoin(
          sops,
          and(eq(documents.type, 'sop'), eq(documents.sourceId, sops.id))
        )
        .where(
          and(
            inArray(documents.id, citedIds),
            eq(sops.requiresLogin, true)
          )
        );
      const restrictedIds = new Set(restricted.map((row) => row.id));
      history = redactRestrictedMessages(history, restrictedIds).filter(
        (message) => !message.loginRequired
      );
    }
  }

  return limitModelHistory(history);
}

/**
 * Keep the newest useful turns inside a bounded prompt budget.
 */
export function limitModelHistory(
  history: Array<Pick<ChatMessage, 'role' | 'content'>>
): ChatMessage[] {
  const selected: ChatMessage[] = [];
  let totalCharacters = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    const content = message.content.trim().slice(0, MAX_HISTORY_MESSAGE_CHARACTERS);
    if (!content) continue;
    if (selected.length >= MAX_HISTORY_MESSAGES) break;

    const remaining = MAX_GENERATION_HISTORY_CHARACTERS - totalCharacters;
    if (remaining <= 0) break;
    const boundedContent = content.slice(0, remaining);
    selected.push({ role: message.role, content: boundedContent });
    totalCharacters += boundedContent.length;
  }

  return selected.reverse();
}

/**
 * Give semantic retrieval enough prior topic to resolve follow-up references
 * while explicitly prioritising the current question.
 */
export function buildContextualRetrievalQuery(
  latestUserMessage: string,
  history: ChatMessage[]
): string {
  const standaloneQuestion = latestUserMessage.slice(
    0,
    MAX_RETRIEVAL_QUERY_CHARACTERS
  );
  if (history.length === 0) return standaloneQuestion;

  const contextPrefix = 'Conversation context:\n';
  const latestPrefix = 'Current question:\n';
  const boundedLatestMessage = latestUserMessage.slice(
    0,
    MAX_RETRIEVAL_QUERY_CHARACTERS - latestPrefix.length
  );
  const latestSection = `${latestPrefix}${boundedLatestMessage}`;
  const availableHistoryCharacters = Math.max(
    0,
    MAX_RETRIEVAL_QUERY_CHARACTERS
      - contextPrefix.length
      - latestSection.length
      - 2
  );
  const historyLines: string[] = [];
  let usedCharacters = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    const label = message.role === 'user' ? 'Previous user' : 'Previous assistant';
    const line = `${label}: ${message.content}`;
    const remaining = availableHistoryCharacters - usedCharacters;
    if (remaining <= 0) break;
    historyLines.push(line.slice(0, remaining));
    usedCharacters += Math.min(line.length, remaining) + 1;
  }

  if (historyLines.length === 0) return standaloneQuestion;
  return `${contextPrefix}${historyLines.reverse().join('\n')}\n\n${latestSection}`;
}
