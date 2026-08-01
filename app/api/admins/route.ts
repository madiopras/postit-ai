import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { hashPassword, requireRole, SUPER_ADMIN_ONLY } from '@/lib/auth';
import { users } from '@/lib/schema';
import { recordAuditEvent } from '@/lib/audit';

const ADMIN_ROLES = ['super_admin', 'admin'] as const;
const ADMIN_STATUSES = ['active', 'inactive'] as const;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAX_PAGE_SIZE = 100;

export const createAdminSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username too long')
    .regex(USERNAME_PATTERN, 'Username contains unsupported characters'),
  displayName: z
    .string()
    .trim()
    .max(200, 'Display name too long')
    .nullable()
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  role: z.enum(ADMIN_ROLES),
  status: z.enum(ADMIN_STATUSES).default('active'),
});

const adminSelection = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  role: users.role,
  status: users.status,
  blockedAt: users.blockedAt,
  blockReason: users.blockReason,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/** GET /api/admins — Super Admin only. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    const search = req.nextUrl.searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(req.nextUrl.searchParams.get('pageSize')) || 20)
    );

    const roleFilter = inArray(users.role, ADMIN_ROLES);
    const where = search
      ? and(
          roleFilter,
          or(
            sql`${users.username} ilike ${`%${search}%`}`,
            sql`${users.displayName} ilike ${`%${search}%`}`
          )
        )
      : roleFilter;

    const rows = await db
      .select(adminSelection)
      .from(users)
      .where(where)
      .orderBy(desc(users.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
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
    console.error('[Admins API] GET error:', error);
    return internalError();
  }
}

/** POST /api/admins — create an administrative account. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    const parsed = createAdminSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const existing = await db.query.users.findFirst({
      where: eq(users.username, parsed.data.username),
    });
    if (existing) return usernameConflict();

    const [created] = await db
      .insert(users)
      .values({
        username: parsed.data.username,
        displayName: parsed.data.displayName || null,
        password: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        status: parsed.data.status,
      })
      .returning(adminSelection);

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'admin.create',
      entityType: 'user',
      entityId: created.id,
      metadata: {
        username: created.username,
        role: created.role,
        status: created.status,
      },
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return usernameConflict();
    console.error('[Admins API] POST error:', error);
    return internalError();
  }
}

function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid admin data',
        details: error.issues,
      },
    },
    { status: 400 }
  );
}

function usernameConflict() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'USERNAME_EXISTS', message: 'Username already exists' },
    },
    { status: 409 }
  );
}

function internalError() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    },
    { status: 500 }
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
