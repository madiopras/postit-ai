import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/schema';

export const runtime = 'nodejs';

const feedbackSchema = z.object({
  // null clears a previously given rating.
  feedback: z.enum(['thumbs_up', 'thumbs_down']).nullable(),
  visitorId: z.string().min(1).max(100),
});

/**
 * PATCH /api/feedback/[messageId]
 *
 * Record a thumbs up/down on an assistant answer. Public, but the message must
 * belong to a conversation owned by the calling visitor — otherwise anyone
 * could rate arbitrary messages by guessing ids.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    const parsed = feedbackSchema.safeParse(await req.json());
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

    const { feedback, visitorId } = parsed.data;

    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    // Same 404 for "missing" and "not yours" so ids cannot be probed.
    if (!message || message.role !== 'assistant') {
      return NextResponse.json(
        { success: false, error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' } },
        { status: 404 }
      );
    }

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, message.chatId),
    });

    if (!chat || chat.visitorId !== visitorId) {
      return NextResponse.json(
        { success: false, error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' } },
        { status: 404 }
      );
    }

    await db.update(messages).set({ feedback }).where(eq(messages.id, messageId));

    return NextResponse.json({ success: true, data: { id: messageId, feedback } });
  } catch (error) {
    console.error('[Feedback API] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
