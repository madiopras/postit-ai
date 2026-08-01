import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sops, sopVersions, documents } from '@/lib/schema';
import { eq, like, and, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { publishSopVersion } from '@/lib/sop-versioning';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';

// Validation schema (the update schema lives in app/api/sop/[id]/route.ts)
const createSopSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  category: z.string().max(100).optional(),
  requiresLogin: z.boolean().default(false),
});

/**
 * GET /api/sop
 * List SOPs with optional filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(sops.title, `%${search}%`),
          like(sops.content, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(sops.category, category));
    }

    if (status) {
      conditions.push(eq(sops.status, status as 'draft' | 'published' | 'error'));
    }

    const whereCondition = conditions.length > 0
      ? and(...conditions)
      : undefined;

    const allSops = await db.query.sops.findMany({
      where: whereCondition,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      orderBy: (s, { desc }) => [desc(s.updatedAt)],
    });

    const totalResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(sops)
      .where(whereCondition || undefined);

    const totalCount = totalResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: allSops,
      meta: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('[SOP API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sop
 * Create new SOP and sync to vector store
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const validatedData = createSopSchema.parse(body);

    const { sop, version } = await db.transaction(async (tx) => {
      const [createdSop] = await tx
        .insert(sops)
        .values({ ...validatedData, status: 'draft' })
        .returning();
      const [createdVersion] = await tx
        .insert(sopVersions)
        .values({
          sopId: createdSop.id,
          versionNumber: 1,
          title: createdSop.title,
          content: createdSop.content,
          createdBy: auth.session.userId,
        })
        .returning();
      return { sop: createdSop, version: createdVersion };
    });

    const status = await publishSopVersion(sop.id, version.id);

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'sop.create',
      entityType: 'sop',
      entityId: sop.id,
      metadata: {
        versionId: version.id,
        status,
        category: sop.category,
        requiresLogin: sop.requiresLogin,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        ...sop,
        status,
        publishedVersionId: status === 'published' ? version.id : null,
        latestVersion: { ...version, indexingStatus: status === 'published' ? 'ready' : 'error' },
      },
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

    console.error('[SOP API] POST error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sop
 * Delete SOP by ID (from query param)
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ID', message: 'SOP ID is required' } },
        { status: 400 }
      );
    }

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
        and(eq(documents.type, 'sop'), eq(documents.sourceId, id))
      );

      // Then delete SOP
      await tx.delete(sops).where(eq(sops.id, id));
    });

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'sop.delete',
      entityType: 'sop',
      entityId: id,
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
