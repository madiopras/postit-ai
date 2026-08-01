import { and, eq, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { chats } from '@/lib/schema';

export const runtime = 'nodejs';

const mergeSchema = z
  .object({ visitorId: z.string().uuid() })
  .strict();

/**
 * Atomically transfer this browser's anonymous conversations to the signed-in
 * account. The ownership predicates make the operation idempotent: a chat can
 * be moved only while it is still anonymous and still carries this visitor id.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidVisitorId();
  }

  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) return invalidVisitorId();

  try {
    const migrated = await db
      .update(chats)
      .set({
        userId: auth.session.userId,
        visitorId: null,
      })
      .where(
        and(
          eq(chats.visitorId, parsed.data.visitorId),
          isNull(chats.userId)
        )
      )
      .returning({ id: chats.id });

    return NextResponse.json({
      success: true,
      data: { migratedCount: migrated.length },
    });
  } catch (error) {
    console.error('[Chat History Merge API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HISTORY_MERGE_FAILED',
          message: 'Riwayat visitor belum dapat digabungkan.',
        },
      },
      { status: 500 }
    );
  }
}

function invalidVisitorId() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Visitor identity tidak valid.',
      },
    },
    { status: 400 }
  );
}
