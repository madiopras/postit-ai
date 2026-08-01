import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { and, eq, isNotNull } from 'drizzle-orm';

import { buildContextualRetrievalQuery } from '../lib/chat-history';
import {
  DEFAULT_RETRIEVAL_CONFIG,
  getAiConfig,
} from '../lib/config';
import { db } from '../lib/db';
import {
  evaluateRetrievalCase,
  findMissingEvaluationKnowledge,
  retrievalEvaluationDatasetSchema,
  summarizeRetrievalEvaluation,
} from '../lib/retrieval-evaluation';
import { retrieveContext } from '../lib/rag';
import { documents } from '../lib/schema';
import {
  retrieveWithDiagnostics,
  type RetrievalDiagnostics,
} from '../lib/retrieval-observability';

const DEFAULT_DATASET = 'evaluations/retrieval-seed-v1.json';

async function main(): Promise<boolean> {
  const datasetPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_DATASET);
  const dataset = retrievalEvaluationDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, 'utf8'))
  );

  console.log(`Retrieval evaluation: ${dataset.name} v${dataset.version}`);
  console.log(`Cases: ${dataset.cases.length}`);

  const indexedDocuments = await db
    .select({ title: documents.title, type: documents.type })
    .from(documents)
    .where(
      and(
        eq(documents.status, 'published'),
        isNotNull(documents.embedding)
      )
    );
  const missingKnowledge = findMissingEvaluationKnowledge(dataset, indexedDocuments);
  if (missingKnowledge.length > 0) {
    console.error(
      'Dataset does not match the indexed knowledge base. Missing expected knowledge for:'
    );
    for (const id of missingKnowledge) console.error(`  - ${id}`);
    console.error(
      'Seed the documented benchmark data or pass a dataset matching this environment.'
    );
    return false;
  }

  const config = await getAiConfig();
  const results = [];

  for (const testCase of dataset.cases) {
    const observedDiagnostics: {
      selectedMode: RetrievalDiagnostics['selectedMode'];
    } = { selectedMode: null };
    const options = {
      maxSources: config.retrievalTopK ?? DEFAULT_RETRIEVAL_CONFIG.topK,
      minScore:
        config.retrievalSimilarityThreshold
        ?? DEFAULT_RETRIEVAL_CONFIG.similarityThreshold,
      authenticated: testCase.authenticated,
      sourcePriority:
        config.retrievalSourcePriority ?? DEFAULT_RETRIEVAL_CONFIG.sourcePriority,
      selectionRule:
        config.retrievalSelectionRule ?? DEFAULT_RETRIEVAL_CONFIG.selectionRule,
      maxContextDocuments:
        config.retrievalMaxContextDocuments
        ?? DEFAULT_RETRIEVAL_CONFIG.maxContextDocuments,
    };
    const retrieval = await retrieveWithDiagnostics({
      standaloneQuery: testCase.question,
      contextualQuery: testCase.history.length > 0
        ? () => buildContextualRetrievalQuery(testCase.question, testCase.history)
        : undefined,
      options,
      retrieve: retrieveContext,
      log: (event) => {
        observedDiagnostics.selectedMode = event.selectedMode;
      },
    });
    const result = evaluateRetrievalCase(testCase, {
      ...retrieval,
      selectedMode: observedDiagnostics.selectedMode,
    });
    results.push(result);
    console.log(
      `${result.passed ? 'PASS' : 'FAIL'} ${result.id}`
      + ` outcome=${result.observed.outcome}`
      + ` mode=${result.observed.selectedMode ?? 'none'}`
      + ` sources=${result.observed.sourceCount}`
      + ` topScore=${result.observed.topScore ?? 'none'}`
    );
  }

  const summary = summarizeRetrievalEvaluation(results, dataset.thresholds);
  console.log('\nMetrics');
  console.log(`  Outcome accuracy: ${percent(summary.metrics.outcomeAccuracy)}`);
  console.log(`  Expected source hit@k: ${percent(summary.metrics.sourceHitRate)}`);
  console.log(`  Source type accuracy: ${percent(summary.metrics.sourceTypeAccuracy)}`);
  console.log(`  Retrieval mode accuracy: ${percent(summary.metrics.modeAccuracy)}`);
  console.log(`  Cases passed: ${summary.passed}/${summary.total}`);

  if (!summary.thresholdPass) {
    console.error('Evaluation thresholds were not met.');
  }
  return summary.thresholdPass;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

main()
  .then((passed) => process.exit(passed ? 0 : 1))
  .catch((error) => {
    console.error(
      'Retrieval evaluation failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  });
