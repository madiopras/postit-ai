import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sops, documents } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { syncSopRecord } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';
import { isUuid } from '@/lib/api';

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
    if (!isUuid(id)) return notFoundSop();

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
    if (!isUuid(id)) return notFoundSop();
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

    const [updatedSop] = await db
      .update(sops)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(sops.id, id))
      .returning();

    // Re-chunk and re-embed only when the text changed, after the update has
    // committed — see syncSopRecord in lib/vector-sync.ts.
    let status = updatedSop.status;
    if (validatedData.title !== undefined || validatedData.content !== undefined) {
      status = await syncSopRecord(updatedSop.id, updatedSop.title, updatedSop.content);
    }

    return NextResponse.json({
      success: true,
      data: { ...updatedSop, status },
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
    if (!isUuid(id)) return notFoundSop();

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
      // Filter on type as well: source ids come from different tables, so
      // matching on source_id alone could delete another entity's vectors.
      await tx
        .delete(documents)
        .where(and(eq(documents.type, 'sop'), eq(documents.sourceId, id)));

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

/** A non-uuid id cannot match any row, so answer 404 rather than letting the
 * Postgres uuid cast fail with a 500. */
function notFoundSop() {
  return NextResponse.json(
    { success: false, error: { code: 'SOP_NOT_FOUND', message: 'SOP not found' } },
    { status: 404 }
  );
}
