import { db } from '@/lib/db';
import { appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * Config interface untuk AI Model Configuration
 */
export interface AiConfig {
  embeddingBaseUrl?: string;
  embeddingModel?: string;
  embeddingApiKey?: string;
  llmBaseUrl?: string;
  llmModel?: string;
  llmApiKey?: string;
}

/**
 * In-memory cache untuk config (singleton pattern)
 * Cache di-invalidate setiap kali config di-update
 */
let cachedConfig: AiConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

/**
 * Load config dari database dengan fallback ke environment variables
 * Prioritas: 1) Database (row aktif) > 2) Environment Variables > 3) Default
 */
export async function getAiConfig(): Promise<AiConfig> {
  const now = Date.now();
  
  // Return cached config jika masih valid
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    // 1. Coba load dari database (row dengan is_active = 'true')
    const activeConfig = await db
      .select()
      .from(appConfig)
      .where(eq(appConfig.isActive, 'true'))
      .limit(1);

    if (activeConfig.length > 0 && activeConfig[0]) {
      const config: AiConfig = {
        embeddingBaseUrl: activeConfig[0].embeddingBaseUrl || undefined,
        embeddingModel: activeConfig[0].embeddingModel || undefined,
        embeddingApiKey: activeConfig[0].embeddingApiKey || undefined,
        llmBaseUrl: activeConfig[0].llmBaseUrl || undefined,
        llmModel: activeConfig[0].llmModel || undefined,
        llmApiKey: activeConfig[0].llmApiKey || undefined,
      };

      // Merge dengan environment variables sebagai fallback
      cachedConfig = {
        embeddingBaseUrl: config.embeddingBaseUrl || process.env.ROUTER_BASE_URL,
        embeddingModel: config.embeddingModel || process.env.EMBEDDING_MODEL,
        embeddingApiKey: config.embeddingApiKey || process.env.ROUTER_API_KEY,
        llmBaseUrl: config.llmBaseUrl || process.env.ROUTER_BASE_URL,
        llmModel: config.llmModel || process.env.LLM_MODEL,
        llmApiKey: config.llmApiKey || process.env.ROUTER_API_KEY,
      };

      cacheTimestamp = now;
      return cachedConfig;
    }
  } catch (error) {
    console.error('[Config] Error loading from database:', error);
    // Fallback ke environment variables jika database error
  }

  // 2. Fallback ke environment variables
  cachedConfig = {
    embeddingBaseUrl: process.env.ROUTER_BASE_URL,
    embeddingModel: process.env.EMBEDDING_MODEL,
    embeddingApiKey: process.env.ROUTER_API_KEY,
    llmBaseUrl: process.env.ROUTER_BASE_URL,
    llmModel: process.env.LLM_MODEL,
    llmApiKey: process.env.ROUTER_API_KEY,
  };

  cacheTimestamp = now;
  return cachedConfig;
}

/**
 * Invalidate cache (dipanggil setelah update config)
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

/**
 * Simpan config baru ke database
 * - Set row lama is_active = 'false'
 * - Insert row baru dengan is_active = 'true'
 */
export async function saveAiConfig(config: AiConfig, updatedBy?: string): Promise<void> {
  const now = new Date();
  
  // Set semua row lama menjadi inactive
  await db
    .update(appConfig)
    .set({ isActive: 'false', updatedAt: now })
    .where(eq(appConfig.isActive, 'true'));

  // Insert row baru
  await db.insert(appConfig).values({
    embeddingBaseUrl: config.embeddingBaseUrl || null,
    embeddingModel: config.embeddingModel || null,
    embeddingApiKey: config.embeddingApiKey || null,
    llmBaseUrl: config.llmBaseUrl || null,
    llmModel: config.llmModel || null,
    llmApiKey: config.llmApiKey || null,
    isActive: 'true',
    updatedBy: updatedBy ? updatedBy as unknown as import('@/lib/schema').User['id'] : null,
    createdAt: now,
    updatedAt: now,
  });

  // Invalidate cache
  invalidateConfigCache();
}

/**
 * Test koneksi ke endpoint AI
 */
export async function testConnection(
  type: 'embedding' | 'llm',
  baseUrl: string,
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; error?: string; latency?: number }> {
  try {
    const startTime = Date.now();
    
    if (type === 'embedding') {
      // Test embedding endpoint
      const testPayload = {
        input: 'test',
        model: model || 'text-embedding-ada-002',
      };

      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }

      await response.json();
    } else {
      // Test LLM endpoint
      const testPayload = {
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        model: model || 'gpt-4o-mini',
        max_tokens: 1,
      };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }

      await response.json();
    }

    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}