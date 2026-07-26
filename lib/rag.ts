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
 * Execute RAG pipeline with streaming
 * 
 * @param userMessage - User's question
 * @param options - RAG options
 * @param onChunk - Callback for each streaming chunk
 * @param onSource - Callback when sources are retrieved
 * @returns Promise resolving to complete response
 */
export async function* ragStream(
  userMessage: string,
  options: RagOptions = {},
  onChunk?: (chunk: StreamingChunk) => void,
  onSource?: (source: RagSource) => void
): AsyncGenerator<StreamingChunk> {
  const {
    maxSources = 5,
    minScore = 0.5,
  } = options;

  try {
    // Step 1: Embed the user query
    const queryEmbedding = await embed(userMessage);

    // Step 2: Search for similar documents
    const searchResults = await searchSimilarDocuments(
      queryEmbedding,
      maxSources,
      minScore
    );

    // Step 3: Build sources array
    const sources: RagSource[] = searchResults.map(r => ({
      title: r.title,
      content: r.content,
      type: r.type,
      score: r.score,
      chunkIndex: r.chunkIndex,
    }));

    // Notify about sources
    if (onSource) {
      for (const source of sources) {
        onSource(source);
      }
    }

    // Step 4: Build messages with context
    const systemPrompt = buildSystemPrompt(sources);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // Step 5: Stream LLM response
    let accumulatedContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of streamChatCompletion(messages, (c) => {
      if (onChunk) onChunk(c);
    })) {
      if (chunk.content) {
        accumulatedContent += chunk.content;
      }
      
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }

      yield chunk;
    }

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

/**
 * Get relevant sources for a query (without generating response)
 * Useful for previewing context before generating answer
 */
export async function getRelevantSources(
  query: string,
  maxSources: number = 5,
  minScore: number = 0.5
): Promise<RagSource[]> {
  const queryEmbedding = await embed(query);
  const results = await searchSimilarDocuments(queryEmbedding, maxSources, minScore);

  return results.map(r => ({
    title: r.title,
    content: r.content,
    type: r.type,
    score: r.score,
    chunkIndex: r.chunkIndex,
  }));
}