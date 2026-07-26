import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { retrieveSources, ragStreamFromSources, type RagSource } from '@/lib/rag';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/schema';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** Public endpoint into a paid LLM — see lib/rate-limit.ts. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
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
}

function toCitation(source: RagSource): Citation {
  return {
    id: source.id,
    type: source.type,
    title: source.title,
    content: source.content,
    score: source.score,
    chunkIndex: source.chunkIndex,
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
          const sources = await retrieveSources(lastUserMessage, {
            maxSources: 5,
            minScore: 0.4,
          });

          sendEvent('status', { type: 'sources' });
          const citations = sources.map(toCitation);

          sendEvent('status', { type: 'streaming' });

          let fullResponse = '';
          let promptTokens = 0;
          let completionTokens = 0;

          for await (const chunk of ragStreamFromSources(lastUserMessage, sources)) {
            if (chunk.content) {
              fullResponse += chunk.content;
              sendChunk({ content: chunk.content });
            }
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
            }
          }

          // Persist, then hand the ids back so the client can wire up feedback.
          let persistedChatId: string | null = null;
          let assistantMessageId: string | null = null;

          try {
            const chat = await resolveChat(chatId, visitorId, lastUserMessage);
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
  visitorId: string,
  firstMessage: string
): Promise<{ id: string }> {
  if (chatId) {
    const existing = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (existing && existing.visitorId === visitorId) {
      return existing;
    }
  }

  const [created] = await db
    .insert(chats)
    .values({
      visitorId,
      title: firstMessage.slice(0, 60),
    })
    .returning();

  return created;
}
