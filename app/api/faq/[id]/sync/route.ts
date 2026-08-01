import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { faqs } from '@/lib/schema';
import { syncFaqRecord } from '@/lib/vector-sync';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import { isUuid } from '@/lib/api';
import { recordAuditEvent } from '@/lib/audit';

/**
 * POST /api/faq/[id]/sync
 *
 * Re-embed one FAQ from its current text. The dashboard's Sync action has
 * always called this path; the handler simply did not exist.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return notFoundFaq();

    const faq = await db.query.faqs.findFirst({ where: eq(faqs.id, id) });
    if (!faq) {
      return NextResponse.json(
        { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
        { status: 404 }
      );
    }

    const status = await syncFaqRecord(faq.id, faq.question, faq.answer);

    if (status === 'error') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SYNC_ERROR', message: 'Failed to embed FAQ — check the AI configuration' },
        },
        { status: 502 }
      );
    }

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'faq.sync',
      entityType: 'faq',
      entityId: faq.id,
      metadata: { status },
    });
    return NextResponse.json({
      success: true,
      message: 'FAQ synced successfully',
      data: { id: faq.id, status },
    });
  } catch (error) {
    console.error('[FAQ Sync API] error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync FAQ' } },
      { status: 500 }
    );
  }
}

/** A non-uuid id cannot match any row, so answer 404 rather than letting the
 * Postgres uuid cast fail with a 500. */
function notFoundFaq() {
  return NextResponse.json(
    { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
    { status: 404 }
  );
}
