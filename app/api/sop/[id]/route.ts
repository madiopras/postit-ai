import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sops, documents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { syncSopToVectors } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';

// Validation schema for update
const updateSopSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long').optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['draft', 'published', 'error']).optional(),
});

/**
 * GET /api/sop/[id]
 * Get single SOP by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const sop = await db.query.sops.findFirst({
      where: eq(sops.id, id),
    });

    if (!sop) {
      return NextResponse.json(
        { success: false, error: { code: 'SOP_NOT_FOUND', message: 'SOP not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sop,
    });
  } catch (error) {
    console.error('[SOP API] GET single error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sop/[id]
 * Update single SOP by ID
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
    const validatedData = updateSopSchema.parse(body);

    // Check if SOP exists
    const existingSop = await db.query.sops.findFirst({
      where: eq(sops.id, id),
    });

    if (!existingSop) {
      return NextResponse.json(
        { success: false, error: { code: 'SOP_NOT_FOUND', message: 'SOP not found' } },
        { status: 404 }
      );
    }

    const updatedSop = await db.transaction(async (tx) => {
      // Update SOP
      const [sop] = await tx
        .update(sops)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(sops.id, id))
        .returning();

      // Resync to vector store if content or title changed
      if (validatedData.title || validatedData.content) {
        try {
          const title = validatedData.title || existingSop.title;
          const content = validatedData.content || existingSop.content;
          await syncSopToVectors(sop.id, title, content, sop.status!);
        } catch (syncError) {
          console.error('[SOP Sync] Error syncing updated SOP:', syncError);
          // Update SOP status to error if sync fails
          await tx
            .update(sops)
            .set({ status: 'error' })
            .where(eq(sops.id, sop.id));
        }
      }

      return sop;
    });

    return NextResponse.json({
      success: true,
      data: updatedSop,
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

    console.error('[SOP API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sop/[id]
 * Delete single SOP by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    // Check if SOP exists
    const existingSop = await db.query.sops.findFirst({
      where: eq(sops.id, id),
    });

    if (!existingSop) {
      return NextResponse.json(
        { success: false, error: { code: 'SOP_NOT_FOUND', message: 'SOP not found' } },
        { status: 404 }
      );
    }

    await db.transaction(async (tx) => {
      // Delete from vector store first
      await tx.delete(documents).where(
        eq(documents.sourceId, id)
      );

      // Then delete SOP
      await tx.delete(sops).where(eq(sops.id, id));
    });

    return NextResponse.json({
      success: true,
      message: 'SOP deleted successfully',
    });
  } catch (error) {
    console.error('[SOP API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}