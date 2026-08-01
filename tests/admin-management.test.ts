import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  hashPassword: vi.fn(),
  findFirst: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  SUPER_ADMIN_ONLY: ['super_admin'],
  requireRole: mocks.requireRole,
  hashPassword: mocks.hashPassword,
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: { users: { findFirst: mocks.findFirst } },
    insert: mocks.insert,
    transaction: mocks.transaction,
  },
}));

import { POST as createAdmin } from '@/app/api/admins/route';
import { PATCH as updateAdmin } from '@/app/api/admins/[id]/route';

const ACTOR_ID = '10000000-0000-4000-8000-000000000001';
const TARGET_ID = '10000000-0000-4000-8000-000000000002';

const admin = {
  id: TARGET_ID,
  username: 'operator',
  password: 'stored-hash',
  displayName: 'Operator',
  role: 'admin' as const,
  status: 'active' as const,
  blockedAt: null,
  blockedBy: null,
  blockReason: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function request(
  url: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function authorize(userId = ACTOR_ID) {
  mocks.requireRole.mockResolvedValue({
    ok: true,
    session: {
      userId,
      username: 'root',
      role: 'super_admin',
      status: 'active',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authorize();
  mocks.hashPassword.mockResolvedValue('new-hash');
});

describe('admin creation', () => {
  it('rejects callers before parsing or writing when authorization fails', async () => {
    mocks.requireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      ),
    });

    const response = await createAdmin(
      request('http://localhost/api/admins', 'POST', {})
    );

    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('creates an administrative account without returning its password', async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    const returned = { ...admin, password: undefined };
    const returning = vi.fn().mockResolvedValue([returned]);
    const values = vi.fn().mockReturnValue({ returning });
    mocks.insert.mockReturnValue({ values });

    const response = await createAdmin(
      request('http://localhost/api/admins', 'POST', {
        username: 'operator',
        displayName: 'Operator',
        password: 'strong-password',
        role: 'admin',
        status: 'active',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.hashPassword).toHaveBeenCalledWith('strong-password');
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'new-hash', role: 'admin' })
    );
    expect(body.data).not.toHaveProperty('password');
  });

  it('returns a conflict for a duplicate username', async () => {
    mocks.findFirst.mockResolvedValue(admin);

    const response = await createAdmin(
      request('http://localhost/api/admins', 'POST', {
        username: 'operator',
        password: 'strong-password',
        role: 'admin',
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'USERNAME_EXISTS' },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('admin privilege transitions', () => {
  it('prevents a Super Admin from changing their own role or status', async () => {
    authorize(TARGET_ID);

    const response = await updateAdmin(
      request(`http://localhost/api/admins/${TARGET_ID}`, 'PATCH', {
        role: 'admin',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'SELF_PRIVILEGE_CHANGE' },
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('protects the last active Super Admin', async () => {
    const target = { ...admin, role: 'super_admin' as const };
    const tx = {
      execute: vi.fn(),
      query: { users: { findFirst: vi.fn().mockResolvedValue(target) } },
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      }),
    };
    mocks.transaction.mockImplementation(
      async (callback: (value: typeof tx) => unknown) => callback(tx)
    );

    const response = await updateAdmin(
      request(`http://localhost/api/admins/${TARGET_ID}`, 'PATCH', {
        status: 'inactive',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'LAST_SUPER_ADMIN' },
    });
    expect(tx.execute).toHaveBeenCalledOnce();
  });

  it('records actor, timestamp, and reason when blocking an admin', async () => {
    let updateValues: Record<string, unknown> | undefined;
    const returning = vi.fn().mockResolvedValue([
      {
        ...admin,
        status: 'blocked',
        blockedBy: ACTOR_ID,
        blockReason: 'Repeated misuse',
      },
    ]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn((values: Record<string, unknown>) => {
      updateValues = values;
      return { where };
    });
    const tx = {
      execute: vi.fn(),
      query: { users: { findFirst: vi.fn().mockResolvedValue(admin) } },
      update: vi.fn().mockReturnValue({ set }),
    };
    mocks.transaction.mockImplementation(
      async (callback: (value: typeof tx) => unknown) => callback(tx)
    );

    const response = await updateAdmin(
      request(`http://localhost/api/admins/${TARGET_ID}`, 'PATCH', {
        status: 'blocked',
        blockReason: 'Repeated misuse',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );

    expect(response.status).toBe(200);
    expect(updateValues).toMatchObject({
      status: 'blocked',
      blockedBy: ACTOR_ID,
      blockReason: 'Repeated misuse',
    });
    expect(updateValues?.blockedAt).toBeInstanceOf(Date);
  });
});

