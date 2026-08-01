import { describe, expect, it } from 'vitest';

import { selectRetrievalSources } from '@/lib/rag';
import type { SearchResult } from '@/lib/vector-sync';

function result(
  id: string,
  type: 'faq' | 'sop',
  score: number
): SearchResult {
  return {
    id,
    type,
    score,
    title: id,
    content: `${id} content`,
    chunkIndex: 0,
  };
}

const candidates = [
  result('faq-high', 'faq', 0.95),
  result('faq-low', 'faq', 0.7),
  result('sop-high', 'sop', 0.9),
  result('sop-low', 'sop', 0.6),
];

describe('retrieval source selection', () => {
  it('uses global score order and the context limit when balanced', () => {
    const selected = selectRetrievalSources(candidates, {
      sourcePriority: 'balanced',
      selectionRule: 'highest_score',
      limit: 3,
    });

    expect(selected.map(({ id }) => id)).toEqual([
      'faq-high',
      'sop-high',
      'faq-low',
    ]);
  });

  it('places the configured source type first without losing score order', () => {
    const faqFirst = selectRetrievalSources(candidates, {
      sourcePriority: 'faq_first',
      selectionRule: 'highest_score',
      limit: 4,
    });
    const sopFirst = selectRetrievalSources(candidates, {
      sourcePriority: 'sop_first',
      selectionRule: 'highest_score',
      limit: 4,
    });

    expect(faqFirst.map(({ id }) => id)).toEqual([
      'faq-high',
      'faq-low',
      'sop-high',
      'sop-low',
    ]);
    expect(sopFirst.map(({ id }) => id)).toEqual([
      'sop-high',
      'sop-low',
      'faq-high',
      'faq-low',
    ]);
  });

  it('alternates source types and starts from the configured priority', () => {
    const selected = selectRetrievalSources(candidates, {
      sourcePriority: 'sop_first',
      selectionRule: 'diverse_sources',
      limit: 4,
    });

    expect(selected.map(({ id }) => id)).toEqual([
      'sop-high',
      'faq-high',
      'sop-low',
      'faq-low',
    ]);
  });

  it('fills the remaining context when only one source type is available', () => {
    const selected = selectRetrievalSources(
      candidates.filter(({ type }) => type === 'faq'),
      {
        sourcePriority: 'sop_first',
        selectionRule: 'diverse_sources',
        limit: 2,
      }
    );

    expect(selected.map(({ id }) => id)).toEqual(['faq-high', 'faq-low']);
  });
});
