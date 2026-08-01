import { describe, expect, it } from 'vitest';

import { buildLexicalSearchQuery } from '@/lib/vector-sync';

describe('hybrid retrieval lexical query', () => {
  it('keeps domain terms while removing conversational Indonesian words', () => {
    expect(buildLexicalSearchQuery('Lalu bagaimana prosedur refund Subsidi Tepat?'))
      .toBe('prosedur refund subsidi tepat');
  });

  it('normalizes punctuation, duplicates, and casing', () => {
    expect(buildLexicalSearchQuery('QR-CODE qr code untuk SPBU'))
      .toBe('qr code spbu');
  });

  it('limits the query to keep database work bounded', () => {
    const query = Array.from({ length: 20 }, (_, index) => `term${index}`).join(' ');

    expect(buildLexicalSearchQuery(query).split(' ')).toHaveLength(12);
  });

  it('returns an empty query when only stop words are supplied', () => {
    expect(buildLexicalSearchQuery('apa ini dan itu?')).toBe('');
  });
});
