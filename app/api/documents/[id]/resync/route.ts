import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, faqs, sops } from '@/lib/schema';
import { syncFaqRecord, syncSopRecord } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';
import { isUuid } from '@/lib/api';

/**
 * POST /api/documents/[id]/resync
 *
 * Re-embed the FAQ or SOP a document chunk came from.
 *
 * The previous version re-synced using the *chunk's* own title and content —
 * so a chunk titled "Prosedur refund (Part 2/3)" was fed back in as if it were
 * the whole document, re-chunking already-chunked text and baking the part
 * suffix into the title. Every resync degraded the content further. Resolving
 * back to the source row is the only correct input.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return notFoundDocument();

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    if (!doc.sourceId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_DOCUMENT', message: 'Document has no source ID' },
        },
        { status: 400 }
      );
    }

    let status: 'published' | 'error';

    if (doc.type === 'faq') {
      const faq = await db.query.faqs.findFirst({ where: eq(faqs.id, doc.sourceId) });
      if (!faq) return sourceMissing('FAQ', id);
      status = await syncFaqRecord(faq.id, faq.question, faq.answer);
    } else {
      const sop = await db.query.sops.findFirst({ where: eq(sops.id, doc.sourceId) });
      if (!sop) return sourceMissing('SOP', id);
      status = await syncSopRecord(sop.id, sop.title, sop.content);
    }

    if (status === 'error') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SYNC_ERROR',
            message: 'Failed to resync document — check the AI configuration',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document resynced successfully',
      data: { sourceId: doc.sourceId, type: doc.type, status },
    });
  } catch (error) {
    console.error('[Documents API] Resync error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * The chunk outlived the row it was derived from. Clear it out rather than
 * leaving an unrecoverable orphan in the vector store.
 */
async function sourceMissing(label: string, documentId: string) {
  await db.delete(documents).where(eq(documents.id, documentId));

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'SOURCE_NOT_FOUND',
        message: `Source ${label} no longer exists — the orphaned document was removed`,
      },
    },
    { status: 404 }
  );
}

/** A non-uuid id cannot match any row, so answer 404 rather than letting the
 * Postgres uuid cast fail with a 500. */
function notFoundDocument() {
  return NextResponse.json(
    { success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } },
    { status: 404 }
  );
}
