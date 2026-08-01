import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  deleteAiConfig: vi.fn(),
  getAiConfig: vi.fn(),
  saveAiConfig: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  SUPER_ADMIN_ONLY: ['super_admin'],
  requireRole: mocks.requireRole,
}));

vi.mock('@/lib/config', () => ({
  deleteAiConfig: mocks.deleteAiConfig,
  getAiConfig: mocks.getAiConfig,
  saveAiConfig: mocks.saveAiConfig,
}));

import { DELETE } from '@/app/api/config/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({
    ok: true,
    session: { userId: 'super-admin-id', role: 'super_admin' },
  });
  mocks.deleteAiConfig.mockResolvedValue(undefined);
});

describe('AI Configuration deletion boundary', () => {
  it('deletes persisted configuration for a Super Admin', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost/api/config', { method: 'DELETE' })
    );

    expect(response.status).toBe(200);
    expect(mocks.requireRole).toHaveBeenCalledWith(
      expect.any(NextRequest),
      ['super_admin']
    );
    expect(mocks.deleteAiConfig).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  it('does not delete configuration when authorization fails', async () => {
    mocks.requireRole.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      ),
    });

    const response = await DELETE(
      new NextRequest('http://localhost/api/config', { method: 'DELETE' })
    );

    expect(response.status).toBe(403);
    expect(mocks.deleteAiConfig).not.toHaveBeenCalled();
  });

  it('returns a safe error without exposing deletion internals', async () => {
    mocks.deleteAiConfig.mockRejectedValue(new Error('database detail'));

    const response = await DELETE(
      new NextRequest('http://localhost/api/config', { method: 'DELETE' })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(JSON.stringify(body)).not.toContain('database detail');
  });
});
