import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  values: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: mocks.insert,
  },
}));

import { recordAuditEvent, sanitizeAuditMetadata } from '@/lib/audit';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.values.mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ values: mocks.values });
});

describe('audit metadata hardening', () => {
  it('recursively removes secrets and document content', () => {
    const sanitized = sanitizeAuditMetadata({
      username: 'alice',
      password: 'plain-text',
      nested: {
        apiKey: 'sk-secret',
        content: 'private SOP text',
        status: 'published',
      },
      authorization: 'Bearer token',
    });

    expect(sanitized).toEqual({
      username: 'alice',
      nested: { status: 'published' },
    });
    expect(JSON.stringify(sanitized)).not.toContain('plain-text');
    expect(JSON.stringify(sanitized)).not.toContain('sk-secret');
    expect(JSON.stringify(sanitized)).not.toContain('private SOP text');
  });

  it('bounds strings, arrays, and nesting depth', () => {
    const sanitized = sanitizeAuditMetadata({
      long: 'x'.repeat(1000),
      many: Array.from({ length: 100 }, (_, index) => index),
      nested: { a: { b: { c: { d: { e: true } } } } },
    });

    expect((sanitized.long as string)).toHaveLength(500);
    expect(sanitized.many).toHaveLength(50);
    expect(JSON.stringify(sanitized)).toContain('[truncated]');
  });
});

describe('audit persistence', () => {
  it('stores bounded request context and actor snapshots', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      headers: {
        'x-forwarded-for': '203.0.113.8, 10.0.0.1',
        'user-agent': 'test-agent',
      },
    });

    await recordAuditEvent({
      actor: {
        userId: '10000000-0000-4000-8000-000000000001',
        username: 'alice',
        role: 'super_admin',
      },
      request,
      action: 'user.update',
      entityType: 'user',
      entityId: 'target-id',
      metadata: { password: 'must-not-be-stored', status: 'blocked' },
    });

    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      actorUsername: 'alice',
      actorRole: 'super_admin',
      action: 'user.update',
      entityType: 'user',
      entityId: 'target-id',
      metadata: { status: 'blocked' },
      ipAddress: '203.0.113.8',
      userAgent: 'test-agent',
    }));
  });
});
