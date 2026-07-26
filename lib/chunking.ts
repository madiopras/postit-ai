/**
 * Configuration for text chunking
 */
export interface ChunkConfig {
  maxTokens: number;
  overlapTokens: number;
  separator: string;
  secondarySeparator: string;
}

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxTokens: 800,
  overlapTokens: 100,
  separator: '\n\n',
  secondarySeparator: '\n',
};

/**
 * Estimate token count from text (roughly 4 characters per token)
 * This is an approximation - actual token count may vary by model
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks based on token limit
 * 
 * @param text - Text to chunk
 * @param config - Chunk configuration
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG
): string[] {
  // First try to split by primary separator (paragraphs)
  let parts = text.split(config.separator).filter(p => p.trim().length > 0);
  
  // If still too large, split by secondary separator (lines)
  if (parts.length === 1 && estimateTokens(parts[0]) > config.maxTokens) {
    parts = text.split(config.secondarySeparator).filter(p => p.trim().length > 0);
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const part of parts) {
    const partTokens = estimateTokens(part);
    
    // If single part is larger than max, split it further
    if (partTokens > config.maxTokens) {
      // Push current chunk if exists
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
        currentTokens = 0;
      }
      
      // Split large part into smaller pieces
      const largeChunks = splitLargePart(part, config);
      chunks.push(...largeChunks);
      continue;
    }

    // Check if adding this part exceeds limit
    if (currentTokens + partTokens > config.maxTokens && currentChunk) {
      // Apply overlap before starting new chunk
      if (config.overlapTokens > 0) {
        const overlapText = getOverlapText(currentChunk, config.overlapTokens);
        currentChunk = overlapText + config.separator + part;
      } else {
        currentChunk = part;
      }
      
      chunks.push(currentChunk.trim());
      currentTokens = estimateTokens(currentChunk);
    } else {
      // Add to current chunk
      if (currentChunk) {
        currentChunk += config.separator + part;
      } else {
        currentChunk = part;
      }
      currentTokens = estimateTokens(currentChunk);
    }
  }

  // Push final chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split a large part that exceeds max tokens
 */
function splitLargePart(text: string, config: ChunkConfig): string[] {
  const chunks: string[] = [];
  const words = text.split(' ');
  let currentChunk = '';
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = estimateTokens(word + ' ');
    
    if (currentTokens + wordTokens > config.maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Apply overlap
      if (config.overlapTokens > 0) {
        const overlapText = getOverlapText(currentChunk, config.overlapTokens);
        currentChunk = overlapText + ' ' + word;
        currentTokens = estimateTokens(currentChunk);
      } else {
        currentChunk = word;
        currentTokens = wordTokens;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
      currentTokens += wordTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Get overlapping text from end of chunk
 */
function getOverlapText(chunk: string, overlapTokens: number): string {
  // Take approximately the last N tokens from chunk
  const approxChars = overlapTokens * 4;
  const startIndex = Math.max(0, chunk.length - approxChars);
  
  // Try to break at sentence or word boundary
  const overlapText = chunk.substring(startIndex);
  const spaceIndex = overlapText.indexOf(' ');
  
  if (spaceIndex > 0) {
    return overlapText.substring(spaceIndex);
  }
  return overlapText;
}

/**
 * Create chunk metadata for vector indexing
 */
export interface ChunkMetadata {
  title: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  sourceId?: string;
  type: 'faq' | 'sop';
}

/**
 * Process SOP into chunks with metadata
 */
export function processSopToChunks(
  title: string,
  content: string,
  sourceId: string,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG
): ChunkMetadata[] {
  const chunks = chunkText(content, config);
  
  return chunks.map((chunkContent, index) => ({
    title: `${title} (Part ${index + 1}/${chunks.length})`,
    content: chunkContent,
    chunkIndex: index,
    totalChunks: chunks.length,
    sourceId,
    type: 'sop' as const,
  }));
}

/**
 * Create FAQ chunk (FAQs are typically short enough for single chunk)
 */
export function processFaqToChunk(
  question: string,
  answer: string,
  sourceId: string
): ChunkMetadata {
  const fullContent = `Q: ${question}\n\nA: ${answer}`;
  
  return {
    title: question,
    content: fullContent,
    chunkIndex: 0,
    totalChunks: 1,
    sourceId,
    type: 'faq' as const,
  };
}