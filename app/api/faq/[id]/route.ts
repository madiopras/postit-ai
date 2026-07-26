import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { faqs, documents } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { syncFaqRecord } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';
import { isUuid } from '@/lib/api';

// Validation schema for update
const updateFaqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long').optional(),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer too long').optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['draft', 'published', 'error']).optional(),
});

/**
 * GET /api/faq/[id]
 * Get single FAQ by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return notFoundFaq();

    const faq = await db.query.faqs.findFirst({
      where: eq(faqs.id, id),
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error('[FAQ API] GET single error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/faq/[id]
 * Update single FAQ by ID
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return notFoundFaq();
    const body = await req.json();
    const validatedData = updateFaqSchema.parse(body);

    // Check if FAQ exists
    const existingFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, id),
    });

    if (!existingFaq) {
      return NextResponse.json(
        { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
        { status: 404 }
      );
    }

    const [updatedFaq] = await db
      .update(faqs)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(faqs.id, id))
      .returning();

    // Re-embed only when the text actually changed, and only after the update
    // has committed — see syncFaqRecord in lib/vector-sync.ts.
    let status = updatedFaq.status;
    if (validatedData.question !== undefined || validatedData.answer !== undefined) {
      status = await syncFaqRecord(
        updatedFaq.id,
        updatedFaq.question,
        updatedFaq.answer
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...updatedFaq, status },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('[FAQ API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faq/[id]
 * Delete single FAQ by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return notFoundFaq();

    // Check if FAQ exists
    const existingFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, id),
    });

    if (!existingFaq) {
      return NextResponse.json(
        { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
        { status: 404 }
      );
    }

    await db.transaction(async (tx) => {
      // Filter on type as well: source ids come from different tables, so
      // matching on source_id alone could delete another entity's vectors.
      await tx
        .delete(documents)
        .where(and(eq(documents.type, 'faq'), eq(documents.sourceId, id)));

      await tx.delete(faqs).where(eq(faqs.id, id));
    });

    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    console.error('[FAQ API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Manual re-sync lives at POST /api/faq/[id]/sync — the path the dashboard
// already calls. It used to be a POST on this route, which both read as
// "create" and left the dashboard's Sync button hitting a 404.

/** A non-uuid id cannot match any row, so answer 404 rather than letting the
 * Postgres uuid cast fail with a 500. */
function notFoundFaq() {
  return NextResponse.json(
    { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
    { status: 404 }
  );
}
