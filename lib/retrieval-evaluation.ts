import { z } from 'zod';

import type { RagSource } from '@/lib/rag';

const expectedOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('sources'),
    sourceType: z.enum(['faq', 'sop']),
    titleIncludes: z.string().min(1),
  }),
  z.object({ kind: z.literal('no_match') }),
  z.object({ kind: z.literal('login_required') }),
]);

export const retrievalEvaluationDatasetSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  thresholds: z.object({
    outcomeAccuracy: z.number().min(0).max(1),
    sourceHitRate: z.number().min(0).max(1),
    sourceTypeAccuracy: z.number().min(0).max(1),
    modeAccuracy: z.number().min(0).max(1),
  }),
  cases: z.array(z.object({
    id: z.string().min(1),
    category: z.enum([
      'faq_direct',
      'sop_direct',
      'semantic_variant',
      'follow_up',
      'topic_switch',
      'out_of_knowledge',
      'access_control',
    ]),
    question: z.string().min(1),
    authenticated: z.boolean().default(false),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })).max(6).default([]),
    expectedMode: z.enum(['standalone', 'contextual']).optional(),
    expected: expectedOutcomeSchema,
  })).min(1),
}).superRefine((dataset, context) => {
  const seen = new Set<string>();
  dataset.cases.forEach((testCase, index) => {
    if (seen.has(testCase.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate evaluation case id: ${testCase.id}`,
        path: ['cases', index, 'id'],
      });
    }
    seen.add(testCase.id);
  });
});

export type RetrievalEvaluationDataset = z.infer<
  typeof retrievalEvaluationDatasetSchema
>;
export type RetrievalEvaluationCase = RetrievalEvaluationDataset['cases'][number];

export interface RetrievalEvaluationObservation {
  sources: RagSource[];
  loginRequired: boolean;
  selectedMode: 'standalone' | 'contextual' | null;
}

export interface RetrievalEvaluationResult {
  id: string;
  category: RetrievalEvaluationCase['category'];
  passed: boolean;
  outcomeCorrect: boolean;
  sourceHit: boolean | null;
  sourceTypeCorrect: boolean | null;
  modeCorrect: boolean | null;
  observed: {
    outcome: 'sources' | 'login_required' | 'no_match';
    selectedMode: 'standalone' | 'contextual' | null;
    sourceCount: number;
    sourceTypes: Array<'faq' | 'sop'>;
    topScore: number | null;
  };
}

export interface RetrievalEvaluationSummary {
  total: number;
  passed: number;
  failed: number;
  metrics: {
    outcomeAccuracy: number;
    sourceHitRate: number;
    sourceTypeAccuracy: number;
    modeAccuracy: number;
  };
  thresholdPass: boolean;
}

export function evaluateRetrievalCase(
  testCase: RetrievalEvaluationCase,
  observation: RetrievalEvaluationObservation
): RetrievalEvaluationResult {
  const outcome = observation.loginRequired
    ? 'login_required'
    : observation.sources.length > 0
      ? 'sources'
      : 'no_match';
  const outcomeCorrect = outcome === testCase.expected.kind;
  let sourceHit: boolean | null = null;
  let sourceTypeCorrect: boolean | null = null;

  if (testCase.expected.kind === 'sources') {
    const expected = testCase.expected;
    const expectedTitle = normalize(expected.titleIncludes);
    const titleMatches = observation.sources.filter((source) =>
      normalize(source.title).includes(expectedTitle)
    );
    sourceHit = titleMatches.length > 0;
    sourceTypeCorrect = titleMatches.some(
      (source) => source.type === expected.sourceType
    );
  }

  const modeCorrect = testCase.expectedMode
    ? observation.selectedMode === testCase.expectedMode
    : null;
  const passed = outcomeCorrect
    && sourceHit !== false
    && sourceTypeCorrect !== false
    && modeCorrect !== false;
  const scores = observation.sources.map((source) => source.score);

  return {
    id: testCase.id,
    category: testCase.category,
    passed,
    outcomeCorrect,
    sourceHit,
    sourceTypeCorrect,
    modeCorrect,
    observed: {
      outcome,
      selectedMode: observation.selectedMode,
      sourceCount: observation.sources.length,
      sourceTypes: [...new Set(observation.sources.map((source) => source.type))],
      topScore: scores.length > 0 ? round(Math.max(...scores)) : null,
    },
  };
}

export function findMissingEvaluationKnowledge(
  dataset: RetrievalEvaluationDataset,
  indexedDocuments: Array<{ title: string; type: 'faq' | 'sop' }>
): string[] {
  return dataset.cases.flatMap((testCase) => {
    if (testCase.expected.kind !== 'sources') return [];
    const expected = testCase.expected;
    const expectedTitle = normalize(expected.titleIncludes);
    const exists = indexedDocuments.some(
      (document) =>
        document.type === expected.sourceType
        && normalize(document.title).includes(expectedTitle)
    );
    return exists ? [] : [testCase.id];
  });
}

export function summarizeRetrievalEvaluation(
  results: RetrievalEvaluationResult[],
  thresholds: RetrievalEvaluationDataset['thresholds']
): RetrievalEvaluationSummary {
  const metrics = {
    outcomeAccuracy: ratio(results.filter((result) => result.outcomeCorrect).length, results.length),
    sourceHitRate: nullableMetric(results, 'sourceHit'),
    sourceTypeAccuracy: nullableMetric(results, 'sourceTypeCorrect'),
    modeAccuracy: nullableMetric(results, 'modeCorrect'),
  };

  return {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    metrics,
    thresholdPass:
      metrics.outcomeAccuracy >= thresholds.outcomeAccuracy
      && metrics.sourceHitRate >= thresholds.sourceHitRate
      && metrics.sourceTypeAccuracy >= thresholds.sourceTypeAccuracy
      && metrics.modeAccuracy >= thresholds.modeAccuracy,
  };
}

function nullableMetric(
  results: RetrievalEvaluationResult[],
  field: 'sourceHit' | 'sourceTypeCorrect' | 'modeCorrect'
): number {
  const applicable = results.filter((result) => result[field] !== null);
  return ratio(
    applicable.filter((result) => result[field] === true).length,
    applicable.length
  );
}

function ratio(value: number, total: number): number {
  return total === 0 ? 1 : round(value / total);
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('id-ID');
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
