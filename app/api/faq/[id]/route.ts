import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { faqs, documents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { syncFaqToFaq } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';

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

    const updatedFaq = await db.transaction(async (tx) => {
      // Update FAQ
      const [faq] = await tx
        .update(faqs)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(faqs.id, id))
        .returning();

      // Resync to vector store if question or answer changed
      if (validatedData.question || validatedData.answer) {
        try {
          const question = validatedData.question || existingFaq.question;
          const answer = validatedData.answer || existingFaq.answer;
          await syncFaqToFaq(faq.id, question, answer, faq.status!);
        } catch (syncError) {
          console.error('[FAQ Sync] Error syncing updated FAQ:', syncError);
          // Update FAQ status to error if sync fails
          await tx
            .update(faqs)
            .set({ status: 'error' })
            .where(eq(faqs.id, faq.id));
        }
      }

      return faq;
    });

    return NextResponse.json({
      success: true,
      data: updatedFaq,
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
      // Delete from vector store first
      await tx.delete(documents).where(eq(documents.sourceId, id));

      // Then delete FAQ
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

/**
 * POST /api/faq/[id]/sync
 * Manual sync single FAQ to vector store
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    // Get FAQ data
    const faq = await db.query.faqs.findFirst({
      where: eq(faqs.id, id),
    });

    if (!faq) {
      return NextResponse.json(
        { success: false, error: { code: 'FAQ_NOT_FOUND', message: 'FAQ not found' } },
        { status: 404 }
      );
    }

    // Sync to vector store
    await syncFaqToFaq(faq.id, faq.question, faq.answer, faq.status!);

    // Update FAQ status to published if sync was successful
    await db
      .update(faqs)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(faqs.id, id));

    return NextResponse.json({
      success: true,
      message: 'FAQ synced successfully',
      data: { id: faq.id, status: 'published' },
    });
  } catch (error) {
    console.error('[FAQ API] Sync error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync FAQ' } },
      { status: 500 }
    );
  }
}