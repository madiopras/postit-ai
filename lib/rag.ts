import { embed } from './embedding';
import { streamChatCompletion, type ChatMessage, type StreamingChunk } from './llm';
import { searchSimilarDocuments, type SearchResult } from './vector-sync';


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
}

export interface RagSource {
  id: string;
  title: string;
  content: string;
  type: 'faq' | 'sop';
  score: number;
  chunkIndex?: number;
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
function buildSystemPrompt(sources: RagSource[]): string {
  const faqSources = sources.filter(s => s.type === 'faq');
  const sopSources = sources.filter(s => s.type === 'sop');

  let context = `You are a helpful assistant for PostIt AI.
Answer questions based on the following knowledge base.

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
- Answer the user's question using the information above
- If the answer is not in the knowledge base, say so honestly
- Always cite your sources by mentioning [FAQ X] or [SOP X]
- Be concise and helpful
- Respond in the same language as the user's question`;

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
  const { maxSources = 5, minScore = 0.5 } = options;

  const queryEmbedding = await embed(userMessage);
  const searchResults = await searchSimilarDocuments(queryEmbedding, maxSources, minScore);

  return searchResults.map(toRagSource);
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
  onChunk?: (chunk: StreamingChunk) => void
): AsyncGenerator<StreamingChunk> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(sources) },
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

    yield* ragStreamFromSources(userMessage, sources, onChunk);
  } catch (error) {
    console.error('[RAG] Error:', error);
    throw error;
  }
}

/**
 * Execute RAG pipeline without streaming (returns complete response)
 * 
 * @param userMessage - User's question
 * @param options - RAG options
 * @returns Complete response with sources
 */
export async function ragQuery(
  userMessage: string,
  options: RagOptions = {}
): Promise<RagResponse> {
  const chunks: string[] = [];
  const sources: RagSource[] = [];

  for await (const chunk of ragStream(
    userMessage,
    options,
    undefined,
    (source) => sources.push(source)
  )) {
    if (chunk.content) {
      chunks.push(chunk.content);
    }
  }

  return {
    content: chunks.join(''),
    sources,
  };
}

