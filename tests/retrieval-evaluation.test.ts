import { describe, expect, it } from 'vitest';

import {
  evaluateRetrievalCase,
  findMissingEvaluationKnowledge,
  retrievalEvaluationDatasetSchema,
  summarizeRetrievalEvaluation,
  type RetrievalEvaluationCase,
} from '@/lib/retrieval-evaluation';

const sourceCase: RetrievalEvaluationCase = {
  id: 'refund',
  category: 'sop_direct',
  question: 'Bagaimana refund?',
  authenticated: false,
  history: [],
  expectedMode: 'standalone',
  expected: {
    kind: 'sources',
    sourceType: 'sop',
    titleIncludes: 'Prosedur Refund',
  },
};

describe('retrieval evaluation', () => {
  it('matches expected documents case-insensitively and reports safe observations', () => {
    const result = evaluateRetrievalCase(sourceCase, {
      sources: [{
        id: 'document-id',
        type: 'sop',
        title: 'PROSEDUR REFUND CUSTOMER',
        content: 'Private evaluation content',
        score: 0.92345,
      }],
      loginRequired: false,
      selectedMode: 'standalone',
    });

    expect(result).toMatchObject({
      passed: true,
      outcomeCorrect: true,
      sourceHit: true,
      sourceTypeCorrect: true,
      modeCorrect: true,
      observed: { topScore: 0.9235 },
    });
    expect(JSON.stringify(result)).not.toContain('Private evaluation content');
    expect(JSON.stringify(result)).not.toContain('document-id');
  });

  it('marks the specific retrieval dimensions that failed', () => {
    const result = evaluateRetrievalCase(sourceCase, {
      sources: [{
        id: 'faq-id',
        type: 'faq',
        title: 'Reset password',
        content: 'Knowledge',
        score: 0.7,
      }],
      loginRequired: false,
      selectedMode: 'contextual',
    });

    expect(result).toMatchObject({
      passed: false,
      outcomeCorrect: true,
      sourceHit: false,
      sourceTypeCorrect: false,
      modeCorrect: false,
    });
  });

  it('calculates only applicable metrics and enforces thresholds', () => {
    const sourcePass = evaluateRetrievalCase(sourceCase, {
      sources: [{
        id: 'sop-id',
        type: 'sop',
        title: 'Prosedur refund',
        content: 'Knowledge',
        score: 0.9,
      }],
      loginRequired: false,
      selectedMode: 'standalone',
    });
    const noMatchCase: RetrievalEvaluationCase = {
      id: 'unknown',
      category: 'out_of_knowledge',
      question: 'Unknown',
      authenticated: false,
      history: [],
      expected: { kind: 'no_match' },
    };
    const noMatchPass = evaluateRetrievalCase(noMatchCase, {
      sources: [],
      loginRequired: false,
      selectedMode: 'standalone',
    });

    const summary = summarizeRetrievalEvaluation(
      [sourcePass, noMatchPass],
      {
        outcomeAccuracy: 1,
        sourceHitRate: 1,
        sourceTypeAccuracy: 1,
        modeAccuracy: 1,
      }
    );

    expect(summary).toEqual({
      total: 2,
      passed: 2,
      failed: 0,
      metrics: {
        outcomeAccuracy: 1,
        sourceHitRate: 1,
        sourceTypeAccuracy: 1,
        modeAccuracy: 1,
      },
      thresholdPass: true,
    });
  });

  it('rejects duplicate or malformed dataset cases at the boundary', () => {
    const parsed = retrievalEvaluationDatasetSchema.safeParse({
      name: 'Invalid',
      version: 1,
      thresholds: {
        outcomeAccuracy: 2,
        sourceHitRate: 1,
        sourceTypeAccuracy: 1,
        modeAccuracy: 1,
      },
      cases: [],
    });

    expect(parsed.success).toBe(false);
  });

  it('detects a dataset that does not match indexed knowledge before evaluation', () => {
    const dataset = retrievalEvaluationDatasetSchema.parse({
      name: 'Coverage',
      version: 1,
      thresholds: {
        outcomeAccuracy: 1,
        sourceHitRate: 1,
        sourceTypeAccuracy: 1,
        modeAccuracy: 1,
      },
      cases: [
        sourceCase,
        {
          id: 'unknown',
          category: 'out_of_knowledge',
          question: 'Unknown',
          expected: { kind: 'no_match' },
        },
      ],
    });

    expect(findMissingEvaluationKnowledge(dataset, [
      { title: 'Reset password', type: 'faq' },
    ])).toEqual(['refund']);
    expect(findMissingEvaluationKnowledge(dataset, [
      { title: 'Prosedur refund customer (Part 1/1)', type: 'sop' },
    ])).toEqual([]);
  });
});
