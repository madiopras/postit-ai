import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: { chats: { findFirst: mocks.findFirst } },
    select: mocks.select,
  },
}));

import {
  buildContextualRetrievalQuery,
  limitModelHistory,
  loadModelHistory,
  MAX_HISTORY_MESSAGES,
} from '@/lib/chat-history';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chat history context', () => {
  it('keeps only the newest bounded server history', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `message-${index}`,
    }));

    const result = limitModelHistory(history);

    expect(result).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(result[0].content).toBe('message-4');
    expect(result.at(-1)?.content).toBe('message-9');
  });

  it('bounds individual messages and total generation history', () => {
    const result = limitModelHistory([
      { role: 'user', content: 'a'.repeat(10_000) },
      { role: 'assistant', content: 'b'.repeat(10_000) },
    ]);

    expect(result).toHaveLength(2);
    expect(result.every((message) => message.content.length === 2_000)).toBe(true);
    expect(result.reduce((total, message) => total + message.content.length, 0))
      .toBeLessThanOrEqual(8_000);
  });

  it('builds retrieval context while prioritising the current question', () => {
    const query = buildContextualRetrievalQuery(
      'Berapa lama prosesnya?',
      [
        { role: 'user', content: 'Bagaimana prosedur refund?' },
        { role: 'assistant', content: 'Refund memerlukan persetujuan manajer.' },
      ]
    );

    expect(query).toContain('Previous user: Bagaimana prosedur refund?');
    expect(query).toContain(
      'Previous assistant: Refund memerlukan persetujuan manajer.'
    );
    expect(query).toContain('Current question:\nBerapa lama prosesnya?');
    expect(query.length).toBeLessThanOrEqual(4_000);
  });

  it('leaves a standalone question unchanged', () => {
    expect(buildContextualRetrievalQuery('Apa kebijakan refund?', []))
      .toBe('Apa kebijakan refund?');
  });

  it('bounds an oversized retrieval query', () => {
    const query = buildContextualRetrievalQuery(
      'latest '.repeat(2_000),
      [{ role: 'user', content: 'old topic '.repeat(1_000) }]
    );

    expect(query.length).toBeLessThanOrEqual(4_000);
    expect(query).toContain('latest');
  });

  it('never loads history from a conversation owned by another visitor', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'chat-id',
      userId: null,
      visitorId: 'visitor-b',
    });

    await expect(loadModelHistory(
      'chat-id',
      { kind: 'visitor', visitorId: 'visitor-a' }
    )).resolves.toEqual([]);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('removes assistant history whose cited SOP is now restricted', async () => {
    mocks.findFirst.mockResolvedValue({
      id: 'chat-id',
      userId: null,
      visitorId: 'visitor-a',
    });
    mocks.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  role: 'assistant',
                  content: 'Isi SOP lama yang sekarang rahasia',
                  sources: [{ id: 'restricted-document' }],
                },
                {
                  role: 'user',
                  content: 'Bagaimana prosedurnya?',
                  sources: [],
                },
              ]),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'restricted-document' }]),
          }),
        }),
      });

    const history = await loadModelHistory(
      'chat-id',
      { kind: 'visitor', visitorId: 'visitor-a' }
    );

    expect(history).toEqual([
      { role: 'user', content: 'Bagaimana prosedurnya?' },
    ]);
    expect(JSON.stringify(history)).not.toContain('rahasia');
  });
});
