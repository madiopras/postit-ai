import { describe, expect, it, vi } from 'vitest';
import {
  AuthClientError,
  fetchCurrentUser,
  mergeVisitorHistory,
  safeRedirectPath,
} from '@/lib/auth-client';

describe('auth client', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['/', '/'],
    ['/dashboard?tab=faq', '/dashboard?tab=faq'],
    ['https://example.com', '/'],
    ['//example.com', '/'],
    ['dashboard', '/'],
    [null, '/'],
  ])('normalizes redirect %s to %s', (value, expected) => {
    expect(safeRedirectPath(value)).toBe(expected);
  });

  it('treats a 401 identity probe as an anonymous visitor', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Login required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(fetchCurrentUser({ fetcher })).resolves.toBeNull();
  });

  it('validates the current-user response before exposing it to the UI', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        data: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          role: 'user',
          status: 'active',
        },
      })
    );

    await expect(fetchCurrentUser({ fetcher })).resolves.toMatchObject({
      username: 'alice',
      role: 'user',
    });
  });

  it('posts only the visitor identity and returns the migrated count', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, data: { migratedCount: 3 } })
    );

    await expect(mergeVisitorHistory('visitor-1', { fetcher })).resolves.toBe(3);
    expect(fetcher).toHaveBeenCalledWith('/api/chat/history/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: 'visitor-1' }),
      signal: undefined,
    });
  });

  it('surfaces a typed merge failure without claiming migration', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          success: false,
          error: {
            code: 'HISTORY_MERGE_FAILED',
            message: 'Riwayat visitor belum dapat digabungkan.',
          },
        },
        { status: 500 }
      )
    );

    const error = await mergeVisitorHistory('visitor-1', { fetcher }).catch(
      (caught: unknown) => caught
    );
    expect(error).toBeInstanceOf(AuthClientError);
    expect(error).toMatchObject({ status: 500, code: 'HISTORY_MERGE_FAILED' });
  });
});
