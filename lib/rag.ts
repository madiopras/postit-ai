import { embed } from './embedding';
import { streamChatCompletion, type ChatMessage, type StreamingChunk } from './llm';
import {
  hasRelevantRestrictedSop,
  searchSimilarDocuments,
  type SearchResult,
} from './vector-sync';
import { DEFAULT_AI_BEHAVIOUR, getAiConfig, type AiConfig } from './config';


/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 * 
 * Flow:
 * 1. Embed user query
 * 2. Search similar documents (FAQ + SOP)
 * 3. Build context from results
 * 4. Call LLM with context injected
 * 5. Stream response
 */

export interface RagOptions {
  maxSources?: number;      // Max sources to retrieve (default: 5)
  minScore?: number;        // Minimum similarity score (default: 0.5)
  temperature?: number;     // LLM temperature (default: 0.7)
  authenticated?: boolean;  // Whether protected SOPs may be retrieved
  sourcePriority?: 'balanced' | 'faq_first' | 'sop_first';
  selectionRule?: 'highest_score' | 'diverse_sources';
  maxContextDocuments?: number;
}

export interface RagSource {
  id: string;
  title: string;
  content: string;
  type: 'faq' | 'sop';
  score: number;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface RagResponse {
  content: string;
  sources: RagSource[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Build system prompt with retrieved context
 */
export function buildSystemPrompt(
  sources: RagSource[],
  behaviour: Pick<
    AiConfig,
    | 'aiPersona'
    | 'aiTone'
    | 'aiDetailLevel'
    | 'aiLanguage'
    | 'aiUseEmoji'
    | 'responseKnowledgeOnly'
    | 'responseNoHallucination'
    | 'responseForbiddenWords'
    | 'responseRequiredWords'
  > = {}
): string {
  const faqSources = sources.filter(s => s.type === 'faq');
  const sopSources = sources.filter(s => s.type === 'sop');

  const persona = behaviour.aiPersona || DEFAULT_AI_BEHAVIOUR.persona;
  const tone = behaviour.aiTone || DEFAULT_AI_BEHAVIOUR.tone;
  const detailLevel = behaviour.aiDetailLevel || DEFAULT_AI_BEHAVIOUR.detailLevel;
  const language = behaviour.aiLanguage || DEFAULT_AI_BEHAVIOUR.language;
  const useEmoji = behaviour.aiUseEmoji ?? DEFAULT_AI_BEHAVIOUR.useEmoji;
  const knowledgeOnly = behaviour.responseKnowledgeOnly ?? true;
  const noHallucination = behaviour.responseNoHallucination ?? true;
  const forbiddenWords = behaviour.responseForbiddenWords ?? [];
  const requiredWords = behaviour.responseRequiredWords ?? [];
  const toneInstruction = {
    formal: 'Use a formal tone.',
    professional: 'Use a professional tone.',
    friendly: 'Use a friendly and approachable tone.',
  }[tone];
  const detailInstruction = {
    concise: 'Keep the answer concise and focused.',
    medium: 'Provide a balanced amount of detail.',
    detailed: 'Provide a detailed answer while staying relevant.',
  }[detailLevel];
  const languageInstruction = {
    same_as_user: "Respond in the same language as the user's question.",
    id: 'Respond in Indonesian.',
    en: 'Respond in English.',
  }[language];

  let context = `${persona}
The following knowledge base contains the only retrieved documents available for this request.

`;

  if (faqSources.length > 0) {
    context += `=== FAQ KNOWLEDGE ===\n`;
    faqSources.forEach((source, i) => {
      context += `[FAQ ${i + 1}] ${source.title}\n`;
      context += `${source.content}\n\n`;
    });
  }

  if (sopSources.length > 0) {
    context += `=== SOP KNOWLEDGE ===\n`;
    sopSources.forEach((source, i) => {
      const partInfo = source.chunkIndex !== undefined && source.chunkIndex > 0
        ? ` (Part ${source.chunkIndex + 1})`
        : '';
      context += `[SOP ${i + 1}${partInfo}] ${source.title}\n`;
      context += `${source.content}\n\n`;
    });
  }

  context += `Instructions:
- ${knowledgeOnly
    ? 'Answer only from the supplied knowledge base context.'
    : 'Prioritize the supplied knowledge base context when answering.'}
- ${noHallucination
    ? 'Do not invent, infer, or add claims that are unsupported by the supplied context.'
    : 'Clearly distinguish supplied knowledge from any general guidance.'}
- Always cite your sources by mentioning [FAQ X] or [SOP X]
- Treat conversation history only as a reference for resolving the user's intent; it is not a knowledge source.
- Prioritize the latest user question. If the topic changed, do not continue the previous topic.
- Do not repeat factual claims from earlier assistant messages unless they are supported by the knowledge supplied in this prompt.
- Never reveal or infer documents that were not supplied in this prompt.
- Follow document access restrictions; never disclose protected SOP content to an unauthenticated user.
- ${toneInstruction}
- ${detailInstruction}
- ${languageInstruction}
- ${useEmoji ? 'Use emoji naturally when appropriate.' : 'Do not use emoji.'}`;

  if (forbiddenWords.length > 0) {
    context += `\n- Never output any of these forbidden phrases: ${JSON.stringify(forbiddenWords)}.`;
  }
  if (requiredWords.length > 0) {
    context += `\n- Required phrase rules: ${JSON.stringify(requiredWords)}. An empty condition means always; otherwise use the phrase when the user's question contains the condition.`;
  }

  return context;
}

/**
 * Retrieve the knowledge-base context for a question.
 *
 * Split out from `ragStream` so a caller that already needs the sources — to
 * send citations to the client, say — can retrieve once and pass them into
 * `ragStreamFromSources`. Previously the chat route embedded and searched, then
 * `ragStream` embedded and searched again: two paid embedding calls per message.
 */
export async function retrieveSources(
  userMessage: string,
  options: RagOptions = {}
): Promise<RagSource[]> {
  return (await retrieveContext(userMessage, options)).sources;
}

export async function retrieveContext(
  userMessage: string,
  options: RagOptions = {}
): Promise<{ sources: RagSource[]; loginRequired: boolean; candidateCount: number }> {
  const {
    maxSources = 5,
    minScore = 0.5,
    authenticated = false,
    sourcePriority = 'balanced',
    selectionRule = 'highest_score',
    maxContextDocuments = maxSources,
  } = options;
  const queryEmbedding = await embed(userMessage);
  const [searchResults, hasRestrictedMatch] = await Promise.all([
    searchSimilarDocuments(
      queryEmbedding,
      maxSources,
      minScore,
      { authenticated, queryText: userMessage }
    ),
    authenticated
      ? Promise.resolve(false)
      : hasRelevantRestrictedSop(queryEmbedding, minScore, userMessage),
  ]);

  const sources = selectRetrievalSources(searchResults, {
    sourcePriority,
    selectionRule,
    limit: Math.min(maxSources, maxContextDocuments),
  }).map(toRagSource);
  return {
    sources,
    candidateCount: searchResults.length,
    // Accessible context takes precedence. A login CTA is only needed when a
    // protected SOP is relevant and there is nothing safe to answer from.
    loginRequired: !authenticated && sources.length === 0 && hasRestrictedMatch,
  };
}

export function selectRetrievalSources(
  results: SearchResult[],
  options: {
    sourcePriority: 'balanced' | 'faq_first' | 'sop_first';
    selectionRule: 'highest_score' | 'diverse_sources';
    limit: number;
  }
): SearchResult[] {
  const byScore = [...results].sort((a, b) => b.score - a.score);
  if (options.selectionRule === 'highest_score') {
    if (options.sourcePriority === 'balanced') return byScore.slice(0, options.limit);
    const preferred = options.sourcePriority === 'faq_first' ? 'faq' : 'sop';
    return byScore
      .sort((a, b) => {
        const typeDifference =
          Number(b.type === preferred) - Number(a.type === preferred);
        return typeDifference || b.score - a.score;
      })
      .slice(0, options.limit);
  }

  const queues = {
    faq: byScore.filter((result) => result.type === 'faq'),
    sop: byScore.filter((result) => result.type === 'sop'),
  };
  let nextType: 'faq' | 'sop';
  if (options.sourcePriority === 'faq_first') nextType = 'faq';
  else if (options.sourcePriority === 'sop_first') nextType = 'sop';
  else nextType = byScore[0]?.type ?? 'faq';

  const selected: SearchResult[] = [];
  while (selected.length < options.limit && (queues.faq.length || queues.sop.length)) {
    const alternate = nextType === 'faq' ? 'sop' : 'faq';
    const item = queues[nextType].shift() ?? queues[alternate].shift();
    if (!item) break;
    selected.push(item);
    nextType = item.type === 'faq' ? 'sop' : 'faq';
  }
  return selected;
}

/** Map a vector-store hit to the shape the prompt builder and clients use. */
export function toRagSource(result: SearchResult): RagSource {
  return {
    id: result.id,
    title: result.title,
    content: result.content,
    type: result.type,
    score: result.score,
    chunkIndex: result.chunkIndex,
    metadata: result.metadata,
  };
}

/**
 * Stream an answer from context that has already been retrieved.
 *
 * @param userMessage - User's question
 * @param sources - Context to inject, from `retrieveSources`
 * @param onChunk - Callback for each streaming chunk
 */
export async function* ragStreamFromSources(
  userMessage: string,
  sources: RagSource[],
  history: ChatMessage[] = [],
  onChunk?: (chunk: StreamingChunk) => void
): AsyncGenerator<StreamingChunk> {
  const config = await getAiConfig();
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(sources, config) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  for await (const chunk of streamChatCompletion(messages, onChunk)) {
    yield chunk;
  }
}

/**
 * Execute the full RAG pipeline with streaming: retrieve, then generate.
 *
 * @param userMessage - User's question
 * @param options - RAG options
 * @param onChunk - Callback for each streaming chunk
 * @param onSource - Callback for each retrieved source
 */
export async function* ragStream(
  userMessage: string,
  options: RagOptions = {},
  onChunk?: (chunk: StreamingChunk) => void,
  onSource?: (source: RagSource) => void
): AsyncGenerator<StreamingChunk> {
  try {
    const sources = await retrieveSources(userMessage, options);

    if (onSource) {
      for (const source of sources) {
        onSource(source);
      }
    }

    yield* ragStreamFromSources(userMessage, sources, [], onChunk);
  } catch (error) {
    console.error('[RAG] Error:', error);
    throw error;
  }
}
