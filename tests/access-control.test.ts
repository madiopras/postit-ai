import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  embed: vi.fn(),
  searchSimilarDocuments: vi.fn(),
  hasRelevantRestrictedSop: vi.fn(),
}));

vi.mock('@/lib/embedding', () => ({
  embed: mocks.embed,
}));

vi.mock('@/lib/vector-sync', () => ({
  searchSimilarDocuments: mocks.searchSimilarDocuments,
  hasRelevantRestrictedSop: mocks.hasRelevantRestrictedSop,
}));

import { retrieveContext } from '@/lib/rag';
import { ownsChat, redactRestrictedMessages } from '@/lib/chat-identity';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.embed.mockResolvedValue([0.1, 0.2]);
  mocks.searchSimilarDocuments.mockResolvedValue([]);
  mocks.hasRelevantRestrictedSop.mockResolvedValue(false);
});

describe('access-aware retrieval', () => {
  it('requests anonymous filtering and returns a login signal without content', async () => {
    mocks.hasRelevantRestrictedSop.mockResolvedValue(true);

    const result = await retrieveContext('private procedure', {
      maxSources: 5,
      minScore: 0.4,
      authenticated: false,
    });

    expect(mocks.searchSimilarDocuments).toHaveBeenCalledWith(
      [0.1, 0.2],
      5,
      0.4,
      { authenticated: false }
    );
    expect(result).toEqual({ sources: [], loginRequired: true });
  });

  it('prefers accessible context over a login prompt', async () => {
    mocks.searchSimilarDocuments.mockResolvedValue([
      {
        id: 'document-id',
        title: 'Public FAQ',
        content: 'Safe public answer',
        type: 'faq',
        score: 0.9,
        chunkIndex: 0,
      },
    ]);
    mocks.hasRelevantRestrictedSop.mockResolvedValue(true);

    const result = await retrieveContext('question', {
      authenticated: false,
    });

    expect(result.loginRequired).toBe(false);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.content).toBe('Safe public answer');
  });

  it('allows protected retrieval for an authenticated account', async () => {
    await retrieveContext('private procedure', { authenticated: true });

    expect(mocks.searchSimilarDocuments).toHaveBeenCalledWith(
      [0.1, 0.2],
      5,
      0.5,
      { authenticated: true }
    );
    expect(mocks.hasRelevantRestrictedSop).not.toHaveBeenCalled();
  });
});

describe('chat ownership boundary', () => {
  const visitorChat = { userId: null, visitorId: 'visitor-a' };
  const userChat = { userId: 'user-a', visitorId: null };

  it('does not let a visitor own an authenticated chat', () => {
    expect(
      ownsChat(userChat, { kind: 'visitor', visitorId: 'visitor-a' })
    ).toBe(false);
  });

  it('does not let a user claim an anonymous chat with the same browser', () => {
    expect(ownsChat(visitorChat, { kind: 'user', userId: 'user-a' })).toBe(false);
  });

  it('matches only the authoritative owner type and identifier', () => {
    expect(
      ownsChat(visitorChat, { kind: 'visitor', visitorId: 'visitor-a' })
    ).toBe(true);
    expect(ownsChat(userChat, { kind: 'user', userId: 'user-a' })).toBe(true);
    expect(ownsChat(userChat, { kind: 'user', userId: 'user-b' })).toBe(false);
  });
});

describe('anonymous history redaction', () => {
  it('removes stored content and citations when a cited SOP becomes private', () => {
    const history = [
      {
        content: 'Previously visible private procedure',
        sources: [{ id: 'restricted-document', content: 'RAHASIA' }],
      },
      {
        content: 'Still public',
        sources: [{ id: 'public-document', content: 'Public' }],
      },
    ];

    const result = redactRestrictedMessages(
      history,
      new Set(['restricted-document'])
    );

    expect(result[0]).toMatchObject({
      loginRequired: true,
      sources: [],
    });
    expect(result[0]?.content).not.toContain('private procedure');
    expect(JSON.stringify(result[0])).not.toContain('RAHASIA');
    expect(result[1]).toEqual(history[1]);
  });
});
