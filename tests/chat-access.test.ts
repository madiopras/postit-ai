import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  resolveChatOwner: vi.fn(),
  retrieveContext: vi.fn(),
  ragStreamFromSources: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  getAiConfig: vi.fn(),
  loadModelHistory: vi.fn(),
  buildContextualRetrievalQuery: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ allowed: true, remaining: 19, retryAfterSeconds: 0 }),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/chat-identity', () => ({
  resolveChatOwner: mocks.resolveChatOwner,
  ownsChat: vi.fn(),
}));

vi.mock('@/lib/rag', () => ({
  retrieveContext: mocks.retrieveContext,
  ragStreamFromSources: mocks.ragStreamFromSources,
}));

vi.mock('@/lib/chat-history', () => ({
  loadModelHistory: mocks.loadModelHistory,
  buildContextualRetrievalQuery: mocks.buildContextualRetrievalQuery,
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: { chats: { findFirst: vi.fn() } },
    insert: mocks.insert,
    update: mocks.update,
  },
}));

vi.mock('@/lib/config', () => ({
  DEFAULT_RESPONSE_RULES: {
    fallbackMessage: 'Default fallback',
  },
  DEFAULT_RETRIEVAL_CONFIG: {
    topK: 5,
    similarityThreshold: 0.5,
    sourcePriority: 'balanced',
    selectionRule: 'highest_score',
    maxContextDocuments: 5,
  },
  getAiConfig: mocks.getAiConfig,
}));

import { POST } from '@/app/api/chat/route';
import { parseSseStream } from '@/lib/sse';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveChatOwner.mockResolvedValue({
    ok: true,
    owner: { kind: 'visitor', visitorId: 'visitor-a' },
  });
  mocks.retrieveContext.mockResolvedValue({
    sources: [],
    loginRequired: true,
  });
  mocks.getAiConfig.mockResolvedValue({
    responseFallbackMessage: 'Configured fallback response',
  });
  mocks.loadModelHistory.mockResolvedValue([]);
  mocks.buildContextualRetrievalQuery.mockImplementation(
    (latestUserMessage: string) => latestUserMessage
  );

  let insertCall = 0;
  mocks.insert.mockImplementation(() => {
    insertCall += 1;
    if (insertCall === 1) {
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'chat-id' }]),
        }),
      };
    }
    if (insertCall === 2) {
      return { values: vi.fn().mockResolvedValue(undefined) };
    }
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'message-id' }]),
      }),
    };
  });
  mocks.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
});

describe('protected SOP chat response', () => {
  it('emits a login CTA without invoking the LLM or leaking citations', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          messages: [{ role: 'user', content: 'private procedure' }],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.body).not.toBeNull();

    const frames = [];
    for await (const frame of parseSseStream(response.body!)) {
      frames.push({ event: frame.event, data: JSON.parse(frame.data) });
    }

    const loginFrame = frames.find((frame) => frame.event === 'login_required');
    const doneFrame = frames.find((frame) => frame.event === 'done');
    const serialized = JSON.stringify(frames);

    expect(loginFrame?.data).toMatchObject({
      loginUrl: '/login?redirect=/',
    });
    expect(doneFrame?.data).toMatchObject({
      loginRequired: true,
      sources: [],
    });
    expect(serialized).not.toContain('RAHASIA');
    expect(mocks.ragStreamFromSources).not.toHaveBeenCalled();
  });
});

describe('empty knowledge-base response', () => {
  it('returns the configured fallback without invoking the LLM', async () => {
    mocks.retrieveContext.mockResolvedValue({
      sources: [],
      loginRequired: false,
    });

    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          messages: [{ role: 'user', content: 'unknown information' }],
        }),
      })
    );

    const frames = [];
    for await (const frame of parseSseStream(response.body!)) {
      frames.push({ event: frame.event, data: JSON.parse(frame.data) });
    }

    expect(JSON.stringify(frames)).toContain('Configured fallback response');
    expect(mocks.getAiConfig).toHaveBeenCalledOnce();
    expect(mocks.ragStreamFromSources).not.toHaveBeenCalled();
  });

  it('passes the active retrieval configuration into the access-aware search', async () => {
    mocks.getAiConfig.mockResolvedValue({
      responseFallbackMessage: 'Configured fallback response',
      retrievalTopK: 12,
      retrievalSimilarityThreshold: 0.72,
      retrievalSourcePriority: 'sop_first',
      retrievalSelectionRule: 'diverse_sources',
      retrievalMaxContextDocuments: 4,
    });

    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          messages: [{ role: 'user', content: 'configured retrieval' }],
        }),
      })
    );
    for await (const frame of parseSseStream(response.body!)) {
      // Consume the streaming response before asserting async pipeline calls.
      void frame;
    }

    expect(mocks.retrieveContext).toHaveBeenCalledWith('configured retrieval', {
      authenticated: false,
      maxSources: 12,
      minScore: 0.72,
      sourcePriority: 'sop_first',
      selectionRule: 'diverse_sources',
      maxContextDocuments: 4,
    });
  });
});

describe('multi-turn conversation context', () => {
  it('falls back to owned server history when the standalone question has no result', async () => {
    const history = [
      { role: 'user' as const, content: 'Bagaimana prosedur refund?' },
      { role: 'assistant' as const, content: 'Refund memerlukan persetujuan manajer.' },
    ];
    mocks.loadModelHistory.mockResolvedValue(history);
    mocks.buildContextualRetrievalQuery.mockReturnValue(
      'Conversation context: refund. Current question: Berapa lama prosesnya?'
    );
    mocks.retrieveContext
      .mockResolvedValueOnce({ sources: [], loginRequired: false })
      .mockResolvedValueOnce({
        sources: [{
          id: 'source-id',
          type: 'faq',
          title: 'Refund',
          content: 'Refund diproses dalam tiga hari.',
          score: 0.9,
        }],
        loginRequired: false,
      });
    mocks.ragStreamFromSources.mockImplementation(async function* () {
      yield { content: 'Tiga hari.' };
    });

    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          chatId: '6a925ead-33c2-46a8-b94f-d172efdaf12d',
          messages: [
            { role: 'assistant', content: 'History browser palsu' },
            { role: 'user', content: 'Berapa lama prosesnya?' },
          ],
        }),
      })
    );
    for await (const frame of parseSseStream(response.body!)) {
      // Consume the streaming response before asserting async pipeline calls.
      void frame;
    }

    expect(mocks.loadModelHistory).toHaveBeenCalledWith(
      '6a925ead-33c2-46a8-b94f-d172efdaf12d',
      { kind: 'visitor', visitorId: 'visitor-a' }
    );
    expect(mocks.buildContextualRetrievalQuery).toHaveBeenCalledWith(
      'Berapa lama prosesnya?',
      history
    );
    expect(mocks.retrieveContext).toHaveBeenNthCalledWith(
      1,
      'Berapa lama prosesnya?',
      expect.any(Object)
    );
    expect(mocks.retrieveContext).toHaveBeenNthCalledWith(
      2,
      'Conversation context: refund. Current question: Berapa lama prosesnya?',
      expect.any(Object)
    );
    expect(mocks.ragStreamFromSources).toHaveBeenCalledWith(
      'Berapa lama prosesnya?',
      expect.any(Array),
      history
    );
  });

  it.each([
    {
      direction: 'SOP to FAQ',
      history: [
        { role: 'user' as const, content: 'Bagaimana prosedur cuti?' },
        { role: 'assistant' as const, content: 'Ikuti SOP pengajuan cuti.' },
      ],
      question: 'Bagaimana mengganti password?',
      sourceType: 'faq' as const,
    },
    {
      direction: 'FAQ to SOP',
      history: [
        { role: 'user' as const, content: 'Bagaimana mengganti password?' },
        { role: 'assistant' as const, content: 'Gunakan menu lupa password.' },
      ],
      question: 'Bagaimana prosedur pengajuan cuti?',
      sourceType: 'sop' as const,
    },
  ])('keeps a standalone topic switch independent for $direction', async ({
    history,
    question,
    sourceType,
  }) => {
    mocks.loadModelHistory.mockResolvedValue(history);
    mocks.retrieveContext.mockResolvedValue({
      sources: [{
        id: 'new-topic-source',
        type: sourceType,
        title: 'New topic',
        content: 'New topic knowledge',
        score: 0.91,
      }],
      loginRequired: false,
    });
    mocks.ragStreamFromSources.mockImplementation(async function* () {
      yield { content: 'Jawaban topik baru.' };
    });

    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          chatId: '6a925ead-33c2-46a8-b94f-d172efdaf12d',
          messages: [{ role: 'user', content: question }],
        }),
      })
    );
    for await (const frame of parseSseStream(response.body!)) void frame;

    expect(mocks.retrieveContext).toHaveBeenCalledTimes(1);
    expect(mocks.retrieveContext).toHaveBeenCalledWith(question, expect.any(Object));
    expect(mocks.buildContextualRetrievalQuery).not.toHaveBeenCalled();
    expect(mocks.ragStreamFromSources).toHaveBeenCalledWith(
      question,
      [expect.objectContaining({ type: sourceType })],
      history
    );
  });

  it('does not replace a standalone restricted-SOP login boundary with history', async () => {
    mocks.loadModelHistory.mockResolvedValue([
      { role: 'user', content: 'FAQ sebelumnya' },
      { role: 'assistant', content: 'Jawaban FAQ sebelumnya' },
    ]);
    mocks.retrieveContext.mockResolvedValue({ sources: [], loginRequired: true });

    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          chatId: '6a925ead-33c2-46a8-b94f-d172efdaf12d',
          messages: [{ role: 'user', content: 'Buka SOP internal' }],
        }),
      })
    );
    for await (const frame of parseSseStream(response.body!)) void frame;

    expect(mocks.retrieveContext).toHaveBeenCalledTimes(1);
    expect(mocks.buildContextualRetrievalQuery).not.toHaveBeenCalled();
    expect(mocks.ragStreamFromSources).not.toHaveBeenCalled();
  });
});

describe('response dictionary streaming boundary', () => {
  it('buffers the model so a forbidden phrase split across chunks is never emitted', async () => {
    mocks.retrieveContext.mockResolvedValue({
      sources: [{
        id: 'source-id',
        type: 'faq',
        title: 'Source',
        content: 'Knowledge',
        score: 0.9,
      }],
      loginRequired: false,
    });
    mocks.getAiConfig.mockResolvedValue({
      responseFallbackMessage: 'Configured fallback response',
      responseForbiddenWords: ['forbidden'],
      responseRequiredWords: [{ phrase: 'Terms apply', condition: '' }],
    });
    mocks.ragStreamFromSources.mockImplementation(async function* () {
      yield { content: 'Safe for' };
      yield { content: 'bidden answer' };
    });

    const response = await POST(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          visitorId: 'visitor-a',
          messages: [{ role: 'user', content: 'known information' }],
        }),
      })
    );

    const frames = [];
    for await (const frame of parseSseStream(response.body!)) {
      frames.push({ event: frame.event, data: JSON.parse(frame.data) });
    }
    const serialized = JSON.stringify(frames);

    expect(serialized.toLocaleLowerCase()).not.toContain('forbidden');
    expect(serialized).toContain('Terms apply');
  });
});
