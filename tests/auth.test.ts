import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { User } from '@/lib/schema';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: mocks.findFirst,
      },
    },
  },
}));

import {
  COOKIE_NAME,
  hashPassword,
  optionalAuth,
  requireAuth,
  requireRole,
  signToken,
} from '@/lib/auth';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as getCurrentUser } from '@/app/api/auth/me/route';
import { GET as getConfig } from '@/app/api/config/route';
import { GET as getStats } from '@/app/api/stats/route';
import { GET as getAuditLogs } from '@/app/api/audit-logs/route';
import { proxy } from '@/proxy';
import { resolveChatOwner } from '@/lib/chat-identity';

const USER_ID = '10000000-0000-4000-8000-000000000001';
let passwordHash: string;

function account(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    username: 'alice',
    password: passwordHash,
    displayName: 'Alice',
    role: 'user',
    status: 'active',
    blockedAt: null,
    blockedBy: null,
    blockReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

async function token(
  overrides: Partial<Parameters<typeof signToken>[0]> = {}
): Promise<string> {
  return signToken({
    userId: USER_ID,
    username: 'alice',
    role: 'user',
    status: 'active',
    ...overrides,
  });
}

function requestWithToken(value?: string): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: value ? { cookie: `${COOKIE_NAME}=${value}` } : undefined,
  });
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-tests';
  passwordHash = await hashPassword('correct-password');
});

beforeEach(() => {
  mocks.findFirst.mockReset();
});

describe('database-backed authentication', () => {
  it('uses the current database role instead of a stale JWT role', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));

    const result = await requireAuth(
      requestWithToken(await token({ role: 'user' }))
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.role).toBe('admin');
  });

  it.each([
    ['blocked', 'ACCOUNT_BLOCKED'],
    ['inactive', 'ACCOUNT_INACTIVE'],
  ] as const)('rejects a %s account even with a valid JWT', async (status, code) => {
    mocks.findFirst.mockResolvedValue(account({ status }));

    const result = await requireAuth(requestWithToken(await token()));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toMatchObject({
        error: { code },
      });
    }
  });

  it('rejects a valid token after its account has been deleted', async () => {
    mocks.findFirst.mockResolvedValue(undefined);

    const result = await requireAuth(requestWithToken(await token()));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('treats a missing cookie as anonymous on an optional route', async () => {
    const result = await optionalAuth(requestWithToken());

    expect(result).toEqual({ ok: true, session: null });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it('does not silently downgrade an invalid cookie to anonymous', async () => {
    const result = await optionalAuth(requestWithToken('not-a-jwt'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });
});

describe('public chat identity', () => {
  it('uses the authenticated account instead of a supplied visitor id', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'user' }));
    const request = requestWithToken(await token());

    const result = await resolveChatOwner(request, 'visitor-a');

    expect(result).toEqual({
      ok: true,
      owner: { kind: 'user', userId: USER_ID },
    });
  });

  it('uses visitor identity only when no account session exists', async () => {
    const result = await resolveChatOwner(requestWithToken(), 'visitor-a');

    expect(result).toEqual({
      ok: true,
      owner: { kind: 'visitor', visitorId: 'visitor-a' },
    });
  });
});

describe('role guard', () => {
  it('allows an explicitly permitted current role', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'super_admin' }));

    const result = await requireRole(
      requestWithToken(await token()),
      ['super_admin']
    );

    expect(result.ok).toBe(true);
  });

  it('returns 403 for an authenticated role without permission', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));

    const result = await requireRole(
      requestWithToken(await token()),
      ['super_admin']
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toMatchObject({
        error: { code: 'FORBIDDEN' },
      });
    }
  });
});

describe('login account status', () => {
  it('signs in an active account and returns its current role and status', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));

    const response = await login(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'alice',
          password: 'correct-password',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(`${COOKIE_NAME}=`);
    await expect(response.json()).resolves.toMatchObject({
      user: { username: 'alice', role: 'admin', status: 'active' },
    });
  });

  it.each([
    ['blocked', 'ACCOUNT_BLOCKED'],
    ['inactive', 'ACCOUNT_INACTIVE'],
  ] as const)('rejects valid credentials for a %s account', async (status, code) => {
    mocks.findFirst.mockResolvedValue(account({ status }));

    const response = await login(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'alice',
          password: 'correct-password',
        }),
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code });
  });

  it('does not reveal account status when the password is wrong', async () => {
    mocks.findFirst.mockResolvedValue(account({ status: 'blocked' }));

    const response = await login(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'alice',
          password: 'wrong-password',
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid credentials',
    });
  });
});

describe('current user endpoint', () => {
  it('returns the current database-backed identity', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'super_admin' }));

    const response = await getCurrentUser(requestWithToken(await token()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: USER_ID,
        username: 'alice',
        displayName: 'Alice',
        role: 'super_admin',
        status: 'active',
      },
    });
  });
});

describe('stage 2 route permissions', () => {
  it('denies AI configuration to an operational admin', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));

    const response = await getConfig(requestWithToken(await token()));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
  });

  it('denies an operational dashboard API to a user', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'user' }));

    const response = await getStats(requestWithToken(await token()));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
  });

  it('denies audit logs to an operational admin', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));

    const response = await getAuditLogs(requestWithToken(await token()));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
  });
});

describe('stage 2 dashboard proxy permissions', () => {
  it('redirects an admin away from AI configuration', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));
    const request = new NextRequest('http://localhost/dashboard/config', {
      headers: { cookie: `${COOKIE_NAME}=${await token()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('redirects an admin away from Admin Management', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));
    const request = new NextRequest('http://localhost/dashboard/admins', {
      headers: { cookie: `${COOKIE_NAME}=${await token()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('redirects a user away from every dashboard page', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'user' }));
    const request = new NextRequest('http://localhost/dashboard/faq', {
      headers: { cookie: `${COOKIE_NAME}=${await token()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('allows a super admin to reach AI configuration', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'super_admin' }));
    const request = new NextRequest('http://localhost/dashboard/config', {
      headers: { cookie: `${COOKIE_NAME}=${await token()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('allows an operational admin to reach User Management', async () => {
    mocks.findFirst.mockResolvedValue(account({ role: 'admin' }));
    const request = new NextRequest('http://localhost/dashboard/users', {
      headers: { cookie: `${COOKIE_NAME}=${await token()}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
