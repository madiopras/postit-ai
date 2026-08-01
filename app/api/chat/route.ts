import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { retrieveContext, ragStreamFromSources, type RagSource } from '@/lib/rag';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/schema';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { ownsChat, resolveChatOwner, type ChatOwner } from '@/lib/chat-identity';
import {
  getAiConfig,
  DEFAULT_RESPONSE_RULES,
  DEFAULT_RETRIEVAL_CONFIG,
} from '@/lib/config';
import {
  enforceResponseDictionary,
  hasResponseDictionary,
} from '@/lib/response-dictionary';
import {
  buildContextualRetrievalQuery,
  loadModelHistory,
} from '@/lib/chat-history';
import { retrieveWithDiagnostics } from '@/lib/retrieval-observability';

export const runtime = 'nodejs';

/** Public endpoint into a paid LLM — see lib/rate-limit.ts. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8_000),
      })
    )
    .min(1, 'At least one message is required'),
  /** Browser identity from localStorage; groups conversations in the sidebar. */
  visitorId: z.string().min(1).max(100),
  /** Existing conversation to append to. Omitted for the first message. */
  chatId: z.string().uuid().optional(),
});

/** What the client needs to render a citation. */
interface Citation {
  id: string;
  type: 'faq' | 'sop';
  title: string;
  content: string;
  score: number;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

function toCitation(source: RagSource): Citation {
  return {
    id: source.id,
    type: source.type,
    title: source.title,
    content: source.content,
    score: source.score,
    chunkIndex: source.chunkIndex,
    metadata: source.metadata,
  };
}

/**
 * POST /api/chat
 *
 * Public, unauthenticated. Streams a RAG answer as SSE and persists the
 * exchange. The terminal `done` event carries the identifiers the client needs
 * to attach citations and to submit feedback.
 */
export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`chat:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.`,
          },
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const parsed = chatRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { messages: chatMessages, visitorId, chatId } = parsed.data;
    const identity = await resolveChatOwner(req, visitorId);
    if (!identity.ok) return identity.response;

    const lastUserMessage = chatMessages.filter((m) => m.role === 'user').pop()?.content?.trim();
    if (!lastUserMessage) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'User message is required' },
        },
        { status: 400 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        const sendChunk = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Retrieve once. The sources are reused for both the prompt and the
          // citations sent to the client — ragStream() would re-embed and
          // re-search, doubling the embedding cost of every message.
          sendEvent('status', { type: 'embedding' });
          sendEvent('status', { type: 'retrieving' });
          const config = await getAiConfig();
          const modelHistory = await loadModelHistory(chatId, identity.owner);
          const retrievalOptions = {
            maxSources: config.retrievalTopK ?? DEFAULT_RETRIEVAL_CONFIG.topK,
            minScore:
              config.retrievalSimilarityThreshold
              ?? DEFAULT_RETRIEVAL_CONFIG.similarityThreshold,
            authenticated: identity.owner.kind === 'user',
            sourcePriority:
              config.retrievalSourcePriority ?? DEFAULT_RETRIEVAL_CONFIG.sourcePriority,
            selectionRule:
              config.retrievalSelectionRule ?? DEFAULT_RETRIEVAL_CONFIG.selectionRule,
            maxContextDocuments:
              config.retrievalMaxContextDocuments
              ?? DEFAULT_RETRIEVAL_CONFIG.maxContextDocuments,
          };
          const retrieval = await retrieveWithDiagnostics({
            standaloneQuery: lastUserMessage,
            contextualQuery: modelHistory.length > 0
              ? () => buildContextualRetrievalQuery(lastUserMessage, modelHistory)
              : undefined,
            options: retrievalOptions,
            retrieve: retrieveContext,
          });
          const { sources, loginRequired } = retrieval;
          const dictionary = {
            forbiddenWords: config.responseForbiddenWords,
            requiredWords: config.responseRequiredWords,
          };

          sendEvent('status', { type: 'sources' });
          const citations = sources.map(toCitation).map((citation) => ({
            ...citation,
            title: enforceResponseDictionary(
              citation.title,
              lastUserMessage,
              { forbiddenWords: dictionary.forbiddenWords }
            ),
            content: enforceResponseDictionary(
              citation.content,
              lastUserMessage,
              { forbiddenWords: dictionary.forbiddenWords }
            ),
          }));

          sendEvent('status', { type: 'streaming' });

          let fullResponse = '';
          let promptTokens = 0;
          let completionTokens = 0;

          if (loginRequired) {
            fullResponse =
              'Informasi tersebut tersedia dalam SOP yang memerlukan login. Silakan login untuk melanjutkan.';
            sendEvent('login_required', {
              message: fullResponse,
              loginUrl: '/login?redirect=/',
            });
            sendChunk({ content: fullResponse });
          } else if (sources.length === 0) {
            fullResponse =
              config.responseFallbackMessage || DEFAULT_RESPONSE_RULES.fallbackMessage;
            sendChunk({ content: fullResponse });
          } else {
            const shouldBuffer = hasResponseDictionary(dictionary);
            for await (const chunk of ragStreamFromSources(
              lastUserMessage,
              sources,
              modelHistory
            )) {
              if (chunk.content) {
                fullResponse += chunk.content;
                if (!shouldBuffer) sendChunk({ content: chunk.content });
              }
              if (chunk.usage) {
                promptTokens = chunk.usage.prompt_tokens;
                completionTokens = chunk.usage.completion_tokens;
              }
            }
            if (shouldBuffer) {
              fullResponse = enforceResponseDictionary(
                fullResponse,
                lastUserMessage,
                dictionary
              );
              if (!fullResponse) {
                fullResponse =
                  config.responseFallbackMessage || DEFAULT_RESPONSE_RULES.fallbackMessage;
              }
              sendChunk({ content: fullResponse });
            }
          }

          // Persist, then hand the ids back so the client can wire up feedback.
          let persistedChatId: string | null = null;
          let assistantMessageId: string | null = null;

          try {
            const chat = await resolveChat(chatId, identity.owner, lastUserMessage);
            persistedChatId = chat.id;

            await db.insert(messages).values({
              chatId: chat.id,
              role: 'user',
              content: lastUserMessage,
            });

            const [assistantMessage] = await db
              .insert(messages)
              .values({
                chatId: chat.id,
                role: 'assistant',
                content: fullResponse,
                sources: citations,
              })
              .returning();

            assistantMessageId = assistantMessage?.id ?? null;

            // Surface this conversation at the top of the sidebar.
            await db
              .update(chats)
              .set({ updatedAt: new Date() })
              .where(eq(chats.id, chat.id));
          } catch (dbError) {
            // A persistence failure must not discard an answer already streamed
            // to the user; the client simply gets no ids back.
            console.error('[Chat API] Failed to persist conversation:', dbError);
          }

          sendEvent('done', {
            chatId: persistedChatId,
            messageId: assistantMessageId,
            sources: citations,
            loginRequired,
            loginUrl: loginRequired ? '/login?redirect=/' : null,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens,
            },
          });
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          sendEvent('error', {
            code: 'CHAT_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Proxies that buffer would defeat streaming entirely.
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * Find the conversation to append to, or start a new one.
 *
 * A chatId that does not belong to this visitor is treated as absent rather
 * than as an error, so a stale id in one tab cannot write into someone else's
 * conversation.
 */
async function resolveChat(
  chatId: string | undefined,
  owner: ChatOwner,
  firstMessage: string
): Promise<{ id: string }> {
  if (chatId) {
    const existing = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (existing && ownsChat(existing, owner)) {
      return existing;
    }
  }

  const [created] = await db
    .insert(chats)
    .values({
      visitorId: owner.kind === 'visitor' ? owner.visitorId : null,
      userId: owner.kind === 'user' ? owner.userId : null,
      title: firstMessage.slice(0, 60),
    })
    .returning();

  return created;
}
