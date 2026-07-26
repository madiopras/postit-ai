import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chats } from '@/lib/schema';

export const runtime = 'nodejs';

/**
 * GET /api/chat/sessions?visitorId=...
 *
 * List a visitor's conversations for the chat sidebar, newest first.
 * Public, like the chat itself — the visitor id is an opaque UUID held in the
 * browser's localStorage, not an account.
 */
export async function GET(req: NextRequest) {
  try {
    const visitorId = req.nextUrl.searchParams.get('visitorId');

    if (!visitorId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'visitorId parameter required' },
        },
        { status: 400 }
      );
    }

    const sessions = await db
      .select({
        id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .where(eq(chats.visitorId, visitorId))
      .orderBy(desc(chats.updatedAt))
      .limit(50);

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('[Chat Sessions API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
