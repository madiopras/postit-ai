import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { DASHBOARD_ROLES, hashPassword, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { recordAuditEvent } from '@/lib/audit';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAX_PAGE_SIZE = 100;

const createUserSchema = z
  .object({
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
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .strict();

const userSelection = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  status: users.status,
  blockedAt: users.blockedAt,
  blockReason: users.blockReason,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/** GET /api/users — list end-user accounts, never administrative accounts. */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const search = req.nextUrl.searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(req.nextUrl.searchParams.get('pageSize')) || 20)
    );
    const where = search
      ? and(
          eq(users.role, 'user'),
          or(
            sql`${users.username} ilike ${`%${search}%`}`,
            sql`${users.displayName} ilike ${`%${search}%`}`
          )
        )
      : eq(users.role, 'user');

    const rows = await db
      .select(userSelection)
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
    console.error('[Users API] GET error:', error);
    return internalError();
  }
}

/** POST /api/users — accounts are administrator-created; no public registration exists. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const parsed = createUserSchema.safeParse(await req.json());
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
        role: 'user',
        status: parsed.data.status,
      })
      .returning(userSelection);

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'user.create',
      entityType: 'user',
      entityId: created.id,
      metadata: { username: created.username, status: created.status },
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return usernameConflict();
    console.error('[Users API] POST error:', error);
    return internalError();
  }
}

function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid user data',
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
