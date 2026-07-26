import { NextRequest, NextResponse } from 'next/server';
import { ragStream } from '@/lib/rag';
import { embed } from '@/lib/embedding';
import { searchSimilarDocuments } from '@/lib/vector-sync';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

/**
 * Interface untuk source citations
 */
interface Citation {
  id: string;
  type: 'faq' | 'sop';
  title: string;
  content: string;
  score: number;
  chunkIndex?: number;
}

interface MessageChunk {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * POST /api/chat
 * Streaming chat endpoint dengan RAG pipeline
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages: chatMessages, sessionId } = body;

    if (!chatMessages || !Array.isArray(chatMessages)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Messages array is required' } },
        { status: 400 }
      );
    }

    const lastUserMessage = (chatMessages as any[])
      .filter((m: any) => m.role === 'user')
      .pop()?.content || '';

    if (!lastUserMessage) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'User message is required' } },
        { status: 400 }
      );
    }

    // Ensure streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Helper function to send message
        const sendMessage = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${type}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Step 1: Embed query
          sendMessage('status', { type: 'embedding' });
          const queryEmbedding = await embed(lastUserMessage);

          // Step 2: Search similar documents
          sendMessage('status', { type: 'retrieving' });
          const searchResults = await searchSimilarDocuments(queryEmbedding, 5, 0.4);

          // Step 3: Send sources
          sendMessage('status', { type: 'sources' });
          const sources: Citation[] = searchResults.map(r => ({
            id: r.id,
            type: r.type,
            title: r.title,
            content: r.content,
            score: r.score,
            chunkIndex: r.chunkIndex,
          }));

          // Step 4: Stream LLM response
          sendMessage('status', { type: 'streaming' });

          let fullResponse = '';
          let promptTokens = 0;
          let completionTokens = 0;

          for await (const chunk of ragStream(lastUserMessage, { maxSources: 5 }, (c) => {
            if (c.content) {
              fullResponse += c.content;
            }
            if (c.usage) {
              promptTokens = c.usage.prompt_tokens;
              completionTokens = c.usage.completion_tokens;
            }
          })) {
            // Send chunk to client
            const chunkData: MessageChunk = { content: chunk.content };
            if (chunk.usage) {
              chunkData.usage = chunk.usage;
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
          }

          // Step 5: Save to database
          try {
            // Find or create chat session
            let chat = await db.query.chats.findFirst({
              where: eq(chats.sessionId, sessionId || ''),
            });

            if (!chat) {
              const newChat = await db.insert(chats).values({
                sessionId: sessionId || randomUUID(),
                title: lastUserMessage.substring(0, 50),
              }).returning();
              chat = newChat[0];
            }

            if (chat) {
              // Save user message
              await db.insert(messages).values({
                chatId: chat.id,
                role: 'user',
                content: lastUserMessage,
              });

              // Save assistant message with sources
              await db.insert(messages).values({
                chatId: chat.id,
                role: 'assistant',
                content: fullResponse,
                sources: sources,
              });
            }
          } catch (dbError) {
            console.error('Database error:', dbError);
            // Don't fail the request if DB save fails
          }

          // Send final usage info
          sendMessage('status', { 
            type: 'done',
            sources: sources.map(s => ({
              id: s.id,
              type: s.type,
              title: s.title,
              score: s.score,
            })),
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens,
            },
          });
        } catch (error) {
          console.error('Chat error:', error);
          sendMessage('error', {
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
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
 * GET /api/chat/sessions
 * Get chat sessions per session ID
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'sessionId parameter required' } },
        { status: 400 }
      );
    }

    const chatSessions = await db.query.chats.findMany({
      where: eq(chats.sessionId, sessionId),
      orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
    });

    return NextResponse.json({
      success: true,
      data: chatSessions,
    });
  } catch (error) {
    console.error('[Chat API] GET sessions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}