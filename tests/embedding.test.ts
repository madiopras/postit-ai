import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Guards the phase-0 bug: `embed()` accepted an array but returned only the
 * first vector while claiming to return `number[]`, so every SOP chunk past the
 * first could have been stored against the wrong embedding.
 *
 * lib/config is mocked so these run without a database or a live endpoint.
 */
vi.mock('@/lib/config', () => ({
  getAiConfig: async () => ({
    embeddingBaseUrl: 'http://embed.test/v1',
    embeddingModel: 'test-model',
    embeddingApiKey: 'sk-test',
  }),
}));

const { embed, embedBatch } = await import('@/lib/embedding');

/** Fake an OpenAI-compatible embeddings response. */
function mockEmbeddings(vectors: number[][], { shuffle = false } = {}) {
  const data = vectors.map((embedding, index) => ({ index, embedding }));
  if (shuffle) data.reverse();

  // Declared with the fetch signature so `mock.calls[0]` types as [url, init]
  // rather than an empty tuple. The args are inspected via mock.calls, not here.
  const impl: (url: string, init: RequestInit) => Promise<Response> = async () =>
    new Response(JSON.stringify({ data, model: 'test-model', usage: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  return vi.fn(impl);
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('embedBatch', () => {
  it('returns one vector per input', async () => {
    vi.stubGlobal('fetch', mockEmbeddings([[1], [2], [3]]));

    const result = await embedBatch(['a', 'b', 'c']);

    expect(result).toHaveLength(3);
    expect(result).toEqual([[1], [2], [3]]);
  });

  it('restores order when the provider returns vectors out of order', async () => {
    // The spec allows any order; callers pair results with inputs positionally,
    // so an unsorted response would attach each chunk to the wrong vector.
    vi.stubGlobal('fetch', mockEmbeddings([[10], [20], [30]], { shuffle: true }));

    expect(await embedBatch(['a', 'b', 'c'])).toEqual([[10], [20], [30]]);
  });

  it('sends the configured model and bearer token', async () => {
    const fetchMock = mockEmbeddings([[1]]);
    vi.stubGlobal('fetch', fetchMock);

    await embedBatch(['halo']);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://embed.test/v1/embeddings');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'test-model',
      input: ['halo'],
    });
  });

  it('throws on a non-2xx response rather than returning empty vectors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('rate limited', { status: 429 }))
    );

    await expect(embedBatch(['a'])).rejects.toThrow(/429/);
  });
});

describe('embed', () => {
  it('returns a single flat vector', async () => {
    vi.stubGlobal('fetch', mockEmbeddings([[0.1, 0.2, 0.3]]));

    const result = await embed('halo');

    // Not an array of arrays: callers pass this straight to a vector column.
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(Array.isArray(result[0])).toBe(false);
  });
});
