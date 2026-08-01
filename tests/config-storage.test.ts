import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  deleteRows: vi.fn(),
  limit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mocks.limit,
        })),
      })),
    })),
    transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/crypto', () => ({
  decryptSecret: vi.fn((value: string) => value),
  encryptSecret: vi.fn((value: string) => `encrypted:${value}`),
}));

import { deleteAiConfig, getAiConfig } from '@/lib/config';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue([]);
  mocks.deleteRows.mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(async (callback) => callback({
    execute: mocks.execute,
    delete: mocks.deleteRows,
  }));
});

describe('AI Configuration storage reset', () => {
  it('deletes all revisions under the same advisory lock used by saves', async () => {
    await deleteAiConfig();

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.deleteRows).toHaveBeenCalledOnce();
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteRows.mock.invocationCallOrder[0]
    );
  });

  it('invalidates the process cache after deletion', async () => {
    await getAiConfig();
    await getAiConfig();
    expect(mocks.limit).toHaveBeenCalledOnce();

    await deleteAiConfig();
    await getAiConfig();

    expect(mocks.limit).toHaveBeenCalledTimes(2);
  });
});
