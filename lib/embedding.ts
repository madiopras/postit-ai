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
