import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { requireRole, SUPER_ADMIN_ONLY } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/schema';

const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(req.nextUrl.searchParams.get('pageSize')) || 25)
    );
    const search = req.nextUrl.searchParams.get('search')?.trim().slice(0, 100);
    const action = req.nextUrl.searchParams.get('action')?.trim().slice(0, 100);
    const entityType = req.nextUrl.searchParams.get('entityType')?.trim().slice(0, 100);
    const from = parseDate(req.nextUrl.searchParams.get('from'));
    const to = parseDate(req.nextUrl.searchParams.get('to'));

    const filters: SQL[] = [];
    if (search) {
      filters.push(or(
        ilike(auditLogs.actorUsername, `%${search}%`),
        ilike(auditLogs.entityId, `%${search}%`)
      )!);
    }
    if (action) filters.push(eq(auditLogs.action, action));
    if (entityType) filters.push(eq(auditLogs.entityType, entityType));
    if (from) filters.push(gte(auditLogs.createdAt, from));
    if (to) filters.push(lte(auditLogs.createdAt, to));
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: {
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    console.error('[Audit API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
