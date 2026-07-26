import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/schema';

export const runtime = 'nodejs';

const notFound = () =>
  NextResponse.json(
    { success: false, error: { code: 'CHAT_NOT_FOUND', message: 'Chat not found' } },
    { status: 404 }
  );

const missingVisitor = () =>
  NextResponse.json(
    {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'visitorId parameter required' },
    },
    { status: 400 }
  );

/**
 * Load a conversation, but only for the visitor that owns it.
 *
 * A mismatched visitor gets the same 404 as a missing chat, so the endpoint
 * cannot be used to probe which conversation ids exist.
 */
async function findOwnedChat(chatId: string, visitorId: string) {
  const chat = await db.query.chats.findFirst({ where: eq(chats.id, chatId) });
  return chat && chat.visitorId === visitorId ? chat : null;
}

/**
 * GET /api/chat/sessions/[id]?visitorId=...
 * Full message history for one conversation, oldest first.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visitorId = req.nextUrl.searchParams.get('visitorId');
    if (!visitorId) return missingVisitor();

    const chat = await findOwnedChat(id, visitorId);
    if (!chat) return notFound();

    const history = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        sources: messages.sources,
        feedback: messages.feedback,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.chatId, id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({
      success: true,
      data: { chat: { id: chat.id, title: chat.title }, messages: history },
    });
  } catch (error) {
    console.error('[Chat Sessions API] GET one error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/sessions/[id]?visitorId=...
 * Messages are removed by the ON DELETE CASCADE on messages.chat_id.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visitorId = req.nextUrl.searchParams.get('visitorId');
    if (!visitorId) return missingVisitor();

    const chat = await findOwnedChat(id, visitorId);
    if (!chat) return notFound();

    await db.delete(chats).where(eq(chats.id, id));

    return NextResponse.json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    console.error('[Chat Sessions API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
