import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { DASHBOARD_ROLES, hashPassword, requireRole } from '@/lib/auth';
import { isUuid } from '@/lib/api';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { recordAuditEvent } from '@/lib/audit';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(100, 'Username too long')
      .regex(USERNAME_PATTERN, 'Username contains unsupported characters')
      .optional(),
    displayName: z.string().trim().max(200, 'Display name too long').nullable().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .optional(),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
    blockReason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'blocked' && !value.blockReason) {
      context.addIssue({
        code: 'custom',
        path: ['blockReason'],
        message: 'Block reason is required',
      });
    }
    if (value.blockReason !== undefined && value.status !== 'blocked') {
      context.addIssue({
        code: 'custom',
        path: ['blockReason'],
        message: 'Block reason is only valid when blocking an account',
      });
    }
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'At least one field is required',
      });
    }
  });

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

/** PATCH /api/users/[id] — the target must remain an end-user account. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return userNotFound();

    const parsed = updateUserSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const target = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.role, 'user')),
    });
    if (!target) return userNotFound();

    if (parsed.data.username && parsed.data.username !== target.username) {
      const duplicate = await db.query.users.findFirst({
        where: and(
          eq(users.username, parsed.data.username),
          ne(users.id, id)
        ),
      });
      if (duplicate) return usernameConflict();
    }

    const password = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : undefined;
    const now = new Date();
    const statusFields =
      parsed.data.status === 'blocked'
        ? {
            status: 'blocked' as const,
            blockedAt: now,
            blockedBy: auth.session.userId,
            blockReason: parsed.data.blockReason!,
          }
        : parsed.data.status
          ? {
              status: parsed.data.status,
              blockedAt: null,
              blockedBy: null,
              blockReason: null,
            }
          : {};

    const [updated] = await db
      .update(users)
      .set({
        ...(parsed.data.username !== undefined
          ? { username: parsed.data.username }
          : {}),
        ...(parsed.data.displayName !== undefined
          ? { displayName: parsed.data.displayName || null }
          : {}),
        ...(password !== undefined ? { password } : {}),
        ...statusFields,
        updatedAt: now,
      })
      // Reassert role in the write predicate in case a concurrent request
      // changed the target after it was read.
      .where(and(eq(users.id, id), eq(users.role, 'user')))
      .returning(userSelection);

    if (!updated) return userNotFound();
    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      metadata: {
        changedFields: Object.keys(parsed.data),
        status: updated.status,
        passwordChanged: parsed.data.password !== undefined,
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isUniqueViolation(error)) return usernameConflict();
    console.error('[Users API] PATCH error:', error);
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

function userNotFound() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    },
    { status: 404 }
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
