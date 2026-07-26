import { getAiConfig } from '@/lib/config';

/**
 * Chat message interface
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streaming chunk interface
 */
export interface StreamingChunk {
  content: string;
  finish?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate chat completion with streaming support
 * 
 * @param messages - Array of chat messages
 * @param onChunk - Callback for each streaming chunk
 * @returns Promise that resolves when streaming is complete
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  onChunk?: (chunk: StreamingChunk) => void
): AsyncGenerator<StreamingChunk> {
  const config = await getAiConfig();
  
  if (!config.llmBaseUrl) {
    throw new Error('LLM base URL not configured');
  }

  try {
    const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.llmApiKey ? { 'Authorization': `Bearer ${config.llmApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.llmModel || 'gpt-4o-mini',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    // Process SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data:')) continue;

        const data = trimmedLine.slice(5).trim();
        
        if (data === '[DONE]') {
          const finalChunk: StreamingChunk = {
            content: '',
            finish: true,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens,
            },
          };
          yield finalChunk;
          if (onChunk) onChunk(finalChunk);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          
          if (content) {
            accumulatedContent += content;
            const chunk: StreamingChunk = { content };
            yield chunk;
            if (onChunk) onChunk(chunk);
          }

          // Check for usage info
          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens || 0;
            completionTokens = parsed.usage.completion_tokens || 0;
          }
        } catch (e) {
          // Skip invalid JSON lines
          console.warn('[LLM] Failed to parse stream data:', data);
        }
      }
    }

    // Send final chunk if stream ended without [DONE]
    if (accumulatedContent) {
      const finalChunk: StreamingChunk = {
        content: '',
        finish: true,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
      };
      yield finalChunk;
      if (onChunk) onChunk(finalChunk);
    }
  } catch (error) {
    console.error('[LLM Stream] Error:', error);
    throw error;
  }
}

/**
 * Generate non-streaming chat completion
 * 
 * @param messages - Array of chat messages
 * @returns Complete response content
 */
export async function chatCompletion(
  messages: ChatMessage[]
): Promise<string> {
  const config = await getAiConfig();
  
  if (!config.llmBaseUrl) {
    throw new Error('LLM base URL not configured');
  }

  try {
    const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.llmApiKey ? { 'Authorization': `Bearer ${config.llmApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.llmModel || 'gpt-4o-mini',
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[LLM] Error:', error);
    throw error;
  }
}