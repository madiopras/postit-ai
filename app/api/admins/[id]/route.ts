import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { hashPassword, requireRole, SUPER_ADMIN_ONLY } from '@/lib/auth';
import { users } from '@/lib/schema';
import { isUuid } from '@/lib/api';
import { recordAuditEvent } from '@/lib/audit';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const updateAdminSchema = z
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
    role: z.enum(['super_admin', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
    blockReason: z.string().trim().min(3).max(500).optional(),
  })
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

/** PATCH /api/admins/[id] — edit, reset password, activate, or block. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return adminNotFound();

    const parsed = updateAdminSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid admin data',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (
      id === auth.session.userId &&
      ((parsed.data.role !== undefined &&
        parsed.data.role !== auth.session.role) ||
        (parsed.data.status !== undefined && parsed.data.status !== 'active'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SELF_PRIVILEGE_CHANGE',
            message: 'You cannot change your own role or account status',
          },
        },
        { status: 409 }
      );
    }

    const password = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : undefined;

    const result = await db.transaction(async (tx) => {
      // Serialise all administrative privilege transitions. This closes the
      // race where two requests each observe another active Super Admin and
      // then both demote or disable one.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('admin-management'))`);

      const target = await tx.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!target || (target.role !== 'super_admin' && target.role !== 'admin')) {
        return { kind: 'not_found' } as const;
      }

      if (parsed.data.username && parsed.data.username !== target.username) {
        const duplicate = await tx.query.users.findFirst({
          where: and(
            eq(users.username, parsed.data.username),
            ne(users.id, id)
          ),
        });
        if (duplicate) return { kind: 'username_exists' } as const;
      }

      const nextRole = parsed.data.role ?? target.role;
      const nextStatus = parsed.data.status ?? target.status;
      const removesActiveSuperAdmin =
        target.role === 'super_admin' &&
        target.status === 'active' &&
        (nextRole !== 'super_admin' || nextStatus !== 'active');

      if (removesActiveSuperAdmin) {
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(eq(users.role, 'super_admin'), eq(users.status, 'active')));
        if (count <= 1) return { kind: 'last_super_admin' } as const;
      }

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

      const [updated] = await tx
        .update(users)
        .set({
          ...(parsed.data.username !== undefined
            ? { username: parsed.data.username }
            : {}),
          ...(parsed.data.displayName !== undefined
            ? { displayName: parsed.data.displayName || null }
            : {}),
          ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
          ...(password !== undefined ? { password } : {}),
          ...statusFields,
          updatedAt: now,
        })
        .where(eq(users.id, id))
        .returning(adminSelection);

      return { kind: 'updated', admin: updated } as const;
    });

    if (result.kind === 'not_found') return adminNotFound();
    if (result.kind === 'username_exists') return usernameConflict();
    if (result.kind === 'last_super_admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LAST_SUPER_ADMIN',
            message: 'The last active Super Admin cannot be demoted or disabled',
          },
        },
        { status: 409 }
      );
    }

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'admin.update',
      entityType: 'user',
      entityId: id,
      metadata: {
        changedFields: Object.keys(parsed.data),
        role: result.admin.role,
        status: result.admin.status,
        passwordChanged: parsed.data.password !== undefined,
      },
    });
    return NextResponse.json({ success: true, data: result.admin });
  } catch (error) {
    if (isUniqueViolation(error)) return usernameConflict();
    console.error('[Admins API] PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

function adminNotFound() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'ADMIN_NOT_FOUND', message: 'Admin not found' },
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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
