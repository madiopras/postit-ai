import { getAiConfig } from '@/lib/config';

/**
 * Embedding response interface
 */
export interface EmbeddingResponse {
  data: Array<{
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate an embedding for a single text.
 *
 * Deliberately accepts only a string. The previous signature also took an array
 * but returned just the first embedding while claiming to return `number[]`,
 * which silently dropped the rest. Use `embedBatch` for multiple texts.
 *
 * @param text - Text to embed
 * @returns The embedding vector
 */
export async function embed(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text]);
  return embedding ?? [];
}

/**
 * Generate multiple embeddings (for batch processing)
 *
 * @param inputs - Array of texts to embed
 * @returns Array of embeddings, in the same order as `inputs`
 */
export async function embedBatch(inputs: string[]): Promise<number[][]> {
  const config = await getAiConfig();
  
  if (!config.embeddingBaseUrl) {
    throw new Error('Embedding base URL not configured');
  }

  try {
    const response = await fetch(`${config.embeddingBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.embeddingApiKey ? { 'Authorization': `Bearer ${config.embeddingApiKey}` } : {}),
      },
      body: JSON.stringify({
        input: inputs,
        model: config.embeddingModel || 'text-embedding-ada-002',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();

    // Sort by `index` before stripping it: the OpenAI-compatible spec allows the
    // provider to return embeddings out of order, and callers pair the result
    // with `inputs` positionally.
    return [...data.data]
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding);
  } catch (error) {
    console.error('[Embedding Batch] Error:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}