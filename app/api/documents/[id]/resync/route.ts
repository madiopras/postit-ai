import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { syncFaqToFaq, syncSopToVectors } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/documents/[id]/resync
 * Manually resync a document to vector store
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    // Get document
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    // Resync based on type
    try {
      if (!doc.sourceId) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_DOCUMENT', message: 'Document has no source ID' } },
          { status: 400 }
        );
      }

      if (doc.type === 'faq') {
        await syncFaqToFaq(doc.sourceId, doc.title || '', doc.content, 'published');
      } else if (doc.type === 'sop') {
        await syncSopToVectors(doc.sourceId, doc.title || '', doc.content, 'published');
      }

      // Update document status to published (synced state)
      await db
        .update(documents)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(documents.id, id));

      return NextResponse.json({
        success: true,
        message: 'Document resynced successfully',
        data: { id: doc.id, status: 'published' },
      });
    } catch (syncError) {
      console.error('[Document Resync] Error syncing document:', syncError);

      // Update document status to error
      await db
        .update(documents)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(documents.id, id));

      return NextResponse.json(
        {
          success: false,
          error: { code: 'SYNC_ERROR', message: 'Failed to resync document to vector store' },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Documents API] Resync error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}