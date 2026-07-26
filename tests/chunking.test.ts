import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHUNK_CONFIG,
  chunkText,
  estimateTokens,
  processFaqToChunk,
  processSopToChunks,
} from '@/lib/chunking';

/**
 * Chunking decides what the model can ever cite. A chunk that silently exceeds
 * the limit, or content dropped between chunks, degrades every answer that
 * depends on it — and does so invisibly.
 */

/** Roughly `tokens` worth of text (the estimator counts 4 chars per token). */
const words = (count: number) =>
  Array.from({ length: count }, (_, i) => `kata${i}`).join(' ');

describe('estimateTokens', () => {
  it('counts about four characters per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2); // rounds up
  });
});

describe('chunkText', () => {
  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('Prosedur singkat.');

    expect(chunks).toEqual(['Prosedur singkat.']);
  });

  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('splits on paragraph boundaries when the text is long enough', () => {
    const para = words(500);
    const chunks = chunkText(`${para}\n\n${para}\n\n${para}`);

    expect(chunks.length).toBeGreaterThan(1);
  });

  it('never emits a chunk far over the token limit', () => {
    // A single unbroken paragraph must still be split by splitLargePart.
    const chunks = chunkText(words(4000));

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Allow a small overshoot from the overlap prefix, but not a runaway one.
      expect(estimateTokens(chunk)).toBeLessThan(DEFAULT_CHUNK_CONFIG.maxTokens * 1.5);
    }
  });

  it('does not lose words when splitting a long paragraph', () => {
    const source = words(3000);
    const chunks = chunkText(source);

    // Overlap means chunks repeat text, so joined output is a superset —
    // the point is that nothing falls through the gaps.
    const joined = chunks.join(' ');
    for (const probe of ['kata0', 'kata1500', 'kata2999']) {
      expect(joined).toContain(probe);
    }
  });

  it('honours a custom config', () => {
    const tiny = { ...DEFAULT_CHUNK_CONFIG, maxTokens: 10, overlapTokens: 0 };
    const chunks = chunkText(words(200), tiny);

    expect(chunks.length).toBeGreaterThan(5);
  });
});

describe('processSopToChunks', () => {
  it('numbers parts from 1 and indexes from 0', () => {
    const chunks = processSopToChunks('Audit keamanan', words(3000), 'sop-1');

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].title).toBe(`Audit keamanan (Part 1/${chunks.length})`);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks.at(-1)!.chunkIndex).toBe(chunks.length - 1);
    expect(chunks.every((c) => c.sourceId === 'sop-1' && c.type === 'sop')).toBe(true);
  });

  it('does not nest a part suffix inside an existing one', () => {
    // The phase-3 resync bug fed a chunk title back in as a document title,
    // producing "Judul (Part 2/3) (Part 1/1)". Titles must carry exactly one.
    const chunks = processSopToChunks('Prosedur refund', words(3000), 'sop-2');

    for (const chunk of chunks) {
      expect(chunk.title.match(/\(Part /g)).toHaveLength(1);
    }
  });
});

describe('processFaqToChunk', () => {
  it('keeps question and answer together in one chunk', () => {
    const chunk = processFaqToChunk('Bagaimana refund?', 'Ajukan lewat form.', 'faq-1');

    expect(chunk.totalChunks).toBe(1);
    expect(chunk.chunkIndex).toBe(0);
    expect(chunk.title).toBe('Bagaimana refund?');
    // Both halves must be embedded: a question-only vector would not match on
    // answer wording, and vice versa.
    expect(chunk.content).toContain('Bagaimana refund?');
    expect(chunk.content).toContain('Ajukan lewat form.');
  });
});
