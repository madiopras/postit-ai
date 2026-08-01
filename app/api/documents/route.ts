import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_PAGE_SIZE = 100;

/**
 * GET /api/documents
 *
 * Vector-store monitoring: which chunks exist, which failed to embed, and which
 * source they belong to. Deliberately never selects the `embedding` column —
 * each row carries 1536 floats that no caller needs.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const params = req.nextUrl.searchParams;
    const search = params.get('search')?.trim() ?? '';
    const type = params.get('type') ?? '';
    const status = params.get('status') ?? '';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get('pageSize')) || 20));

    const conditions = [];

    if (search) {
      conditions.push(
        or(ilike(documents.title, `%${search}%`), ilike(documents.content, `%${search}%`))
      );
    }
    if (type === 'faq' || type === 'sop') {
      conditions.push(eq(documents.type, type));
    }
    if (status === 'draft' || status === 'published' || status === 'error') {
      conditions.push(eq(documents.status, status));
    }
    if (params.get('missingEmbedding') === 'true') {
      conditions.push(isNull(documents.embedding));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        chunkIndex: documents.chunkIndex,
        sourceId: documents.sourceId,
        status: documents.status,
        updatedAt: documents.updatedAt,
        // Length only — the vector itself is never sent to the client.
        hasEmbedding: sql<boolean>`${documents.embedding} is not null`,
        contentPreview: sql<string>`left(${documents.content}, 160)`,
      })
      .from(documents)
      .where(where)
      .orderBy(desc(documents.updatedAt), documents.chunkIndex)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(where);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
      },
    });
  } catch (error) {
    console.error('[Documents API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
