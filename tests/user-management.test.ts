import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  hashPassword: vi.fn(),
  findFirst: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  DASHBOARD_ROLES: ['super_admin', 'admin'],
  requireRole: mocks.requireRole,
  hashPassword: mocks.hashPassword,
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: { users: { findFirst: mocks.findFirst } },
    insert: mocks.insert,
    update: mocks.update,
  },
}));

import { POST as createUser } from '@/app/api/users/route';
import { PATCH as updateUser } from '@/app/api/users/[id]/route';

const ACTOR_ID = '10000000-0000-4000-8000-000000000001';
const TARGET_ID = '10000000-0000-4000-8000-000000000002';

const user = {
  id: TARGET_ID,
  username: 'employee',
  password: 'stored-hash',
  displayName: 'Employee',
  role: 'user' as const,
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({
    ok: true,
    session: {
      userId: ACTOR_ID,
      username: 'operator',
      role: 'admin',
      status: 'active',
    },
  });
  mocks.hashPassword.mockResolvedValue('new-hash');
});

describe('user creation', () => {
  it('rejects non-dashboard roles before parsing or writing', async () => {
    mocks.requireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      ),
    });

    const response = await createUser(
      request('http://localhost/api/users', 'POST', {})
    );

    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lets an Admin create a user without returning the password', async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    const returned = { ...user, password: undefined };
    const returning = vi.fn().mockResolvedValue([returned]);
    const values = vi.fn().mockReturnValue({ returning });
    mocks.insert.mockReturnValue({ values });

    const response = await createUser(
      request('http://localhost/api/users', 'POST', {
        username: 'employee',
        displayName: 'Employee',
        password: 'strong-password',
        status: 'active',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'new-hash',
        role: 'user',
        status: 'active',
      })
    );
    expect(body.data).not.toHaveProperty('password');
  });

  it('rejects role injection instead of silently promoting a user', async () => {
    const response = await createUser(
      request('http://localhost/api/users', 'POST', {
        username: 'employee',
        password: 'strong-password',
        status: 'active',
        role: 'super_admin',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('returns a conflict for a username used by any account role', async () => {
    mocks.findFirst.mockResolvedValue({ ...user, role: 'admin' });

    const response = await createUser(
      request('http://localhost/api/users', 'POST', {
        username: 'employee',
        password: 'strong-password',
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'USERNAME_EXISTS' },
    });
  });
});

describe('user updates', () => {
  it('rejects role fields on update', async () => {
    const response = await updateUser(
      request(`http://localhost/api/users/${TARGET_ID}`, 'PATCH', {
        role: 'admin',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('does not treat an administrative account as a manageable user', async () => {
    mocks.findFirst.mockResolvedValue(undefined);

    const response = await updateUser(
      request(`http://localhost/api/users/${TARGET_ID}`, 'PATCH', {
        displayName: 'Changed',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'USER_NOT_FOUND' },
    });
  });

  it('records actor and reason when blocking a user', async () => {
    mocks.findFirst.mockResolvedValue(user);
    let updateValues: Record<string, unknown> | undefined;
    const returning = vi.fn().mockResolvedValue([
      {
        ...user,
        status: 'blocked',
        blockedBy: ACTOR_ID,
        blockReason: 'Abusive chat usage',
      },
    ]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn((values: Record<string, unknown>) => {
      updateValues = values;
      return { where };
    });
    mocks.update.mockReturnValue({ set });

    const response = await updateUser(
      request(`http://localhost/api/users/${TARGET_ID}`, 'PATCH', {
        status: 'blocked',
        blockReason: 'Abusive chat usage',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) }
    );

    expect(response.status).toBe(200);
    expect(updateValues).toMatchObject({
      status: 'blocked',
      blockedBy: ACTOR_ID,
      blockReason: 'Abusive chat usage',
    });
    expect(updateValues?.blockedAt).toBeInstanceOf(Date);
  });
});

