import type { RagOptions, RagSource } from '@/lib/rag';

type RetrievalMode = 'standalone' | 'contextual';

interface RetrievalResult {
  sources: RagSource[];
  loginRequired: boolean;
  candidateCount?: number;
}

interface RetrievalAttempt {
  mode: RetrievalMode;
  durationMs: number;
  candidateCount: number;
  sourceCount: number;
  faqCount: number;
  sopCount: number;
  topScore: number | null;
  loginRequired: boolean;
}

export interface RetrievalDiagnostics {
  event: 'chat.retrieval';
  requestId: string;
  outcome: 'sources' | 'login_required' | 'no_match' | 'error';
  selectedMode: RetrievalMode | null;
  fallbackReason: 'standalone_no_accessible_sources' | null;
  failureStage: RetrievalMode | null;
  totalDurationMs: number;
  attempts: RetrievalAttempt[];
  configuration: {
    authenticated: boolean;
    topK: number;
    similarityThreshold: number;
    maxContextDocuments: number;
    sourcePriority: NonNullable<RagOptions['sourcePriority']>;
    selectionRule: NonNullable<RagOptions['selectionRule']>;
  };
}

type RetrievalFunction = (
  query: string,
  options: RagOptions
) => Promise<RetrievalResult>;

interface ObservableRetrievalInput {
  standaloneQuery: string;
  contextualQuery?: () => string;
  options: Required<
    Pick<
      RagOptions,
      | 'maxSources'
      | 'minScore'
      | 'authenticated'
      | 'sourcePriority'
      | 'selectionRule'
      | 'maxContextDocuments'
    >
  >;
  retrieve: RetrievalFunction;
  requestId?: string;
  now?: () => number;
  log?: (diagnostics: RetrievalDiagnostics) => void;
}

/**
 * Execute topic-switch-safe retrieval and emit one bounded, content-free event.
 * The event intentionally excludes queries, document ids/content, embeddings,
 * account identity, provider details, and exception messages.
 */
export async function retrieveWithDiagnostics({
  standaloneQuery,
  contextualQuery,
  options,
  retrieve,
  requestId = crypto.randomUUID(),
  now = performance.now.bind(performance),
  log = logRetrievalDiagnostics,
}: ObservableRetrievalInput): Promise<RetrievalResult> {
  const startedAt = now();
  const attempts: RetrievalAttempt[] = [];
  let fallbackReason: RetrievalDiagnostics['fallbackReason'] = null;
  let failureStage: RetrievalMode | null = 'standalone';

  try {
    let selectedMode: RetrievalMode = 'standalone';
    let result = await runAttempt(
      'standalone',
      standaloneQuery,
      options,
      retrieve,
      attempts,
      now
    );

    if (result.sources.length === 0 && !result.loginRequired && contextualQuery) {
      const query = contextualQuery();
      if (query !== standaloneQuery) {
        fallbackReason = 'standalone_no_accessible_sources';
        selectedMode = 'contextual';
        failureStage = 'contextual';
        result = await runAttempt(
          'contextual',
          query,
          options,
          retrieve,
          attempts,
          now
        );
      }
    }

    failureStage = null;
    log(createDiagnostics({
      requestId,
      result,
      selectedMode,
      fallbackReason,
      failureStage,
      totalDurationMs: elapsed(startedAt, now()),
      attempts,
      options,
    }));
    return result;
  } catch (error) {
    log(createDiagnostics({
      requestId,
      result: null,
      selectedMode: null,
      fallbackReason,
      failureStage,
      totalDurationMs: elapsed(startedAt, now()),
      attempts,
      options,
    }));
    throw error;
  }
}

async function runAttempt(
  mode: RetrievalMode,
  query: string,
  options: ObservableRetrievalInput['options'],
  retrieve: RetrievalFunction,
  attempts: RetrievalAttempt[],
  now: () => number
): Promise<RetrievalResult> {
  const startedAt = now();
  const result = await retrieve(query, options);
  const scores = result.sources.map((source) => source.score);
  attempts.push({
    mode,
    durationMs: elapsed(startedAt, now()),
    candidateCount: result.candidateCount ?? result.sources.length,
    sourceCount: result.sources.length,
    faqCount: result.sources.filter((source) => source.type === 'faq').length,
    sopCount: result.sources.filter((source) => source.type === 'sop').length,
    topScore: scores.length > 0 ? round(Math.max(...scores)) : null,
    loginRequired: result.loginRequired,
  });
  return result;
}

function createDiagnostics({
  requestId,
  result,
  selectedMode,
  fallbackReason,
  failureStage,
  totalDurationMs,
  attempts,
  options,
}: {
  requestId: string;
  result: RetrievalResult | null;
  selectedMode: RetrievalMode | null;
  fallbackReason: RetrievalDiagnostics['fallbackReason'];
  failureStage: RetrievalMode | null;
  totalDurationMs: number;
  attempts: RetrievalAttempt[];
  options: ObservableRetrievalInput['options'];
}): RetrievalDiagnostics {
  const outcome = result === null
    ? 'error'
    : result.loginRequired
      ? 'login_required'
      : result.sources.length > 0
        ? 'sources'
        : 'no_match';

  return {
    event: 'chat.retrieval',
    requestId,
    outcome,
    selectedMode,
    fallbackReason,
    failureStage,
    totalDurationMs: elapsed(0, totalDurationMs),
    attempts,
    configuration: {
      authenticated: options.authenticated,
      topK: options.maxSources,
      similarityThreshold: options.minScore,
      maxContextDocuments: options.maxContextDocuments,
      sourcePriority: options.sourcePriority,
      selectionRule: options.selectionRule,
    },
  };
}

function logRetrievalDiagnostics(diagnostics: RetrievalDiagnostics): void {
  console.info('[Retrieval Diagnostics]', JSON.stringify(diagnostics));
}

function elapsed(start: number, end: number): number {
  return round(Math.max(0, end - start));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
