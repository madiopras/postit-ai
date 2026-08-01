import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { execute: mocks.execute },
}));

import { GET } from '@/app/api/health/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockResolvedValue([{ '?column?': 1 }]);
});

describe('readiness health endpoint', () => {
  it('returns a minimal success response when the database is reachable', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns 503 without leaking database errors', async () => {
    mocks.execute.mockRejectedValue(new Error('postgres host and credential details'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(body)).not.toContain('postgres');
  });
});
