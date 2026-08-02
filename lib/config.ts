import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { appConfig } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

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
  aiPersona?: string;
  aiTone?: "formal" | "professional" | "friendly";
  aiDetailLevel?: "concise" | "medium" | "detailed";
  aiLanguage?: "same_as_user" | "id" | "en";
  aiUseEmoji?: boolean;
  responseKnowledgeOnly?: boolean;
  responseNoHallucination?: boolean;
  responseFallbackMessage?: string;
  responseForbiddenWords?: string[];
  responseRequiredWords?: Array<{ phrase: string; condition: string }>;
  retrievalTopK?: number;
  retrievalSimilarityThreshold?: number;
  retrievalSourcePriority?: "balanced" | "faq_first" | "sop_first";
  retrievalSelectionRule?: "highest_score" | "diverse_sources";
  retrievalMaxContextDocuments?: number;
}

export const DEFAULT_AI_BEHAVIOUR = {
  persona: "You are a helpful assistant for PostIt AI.",
  tone: "professional" as const,
  detailLevel: "medium" as const,
  language: "same_as_user" as const,
  useEmoji: false,
};

export const DEFAULT_RESPONSE_RULES = {
  knowledgeOnly: true,
  noHallucination: true,
  fallbackMessage:
    "Informasi belum tersedia dalam Knowledge Base. Silakan hubungi administrator atau pihak terkait.",
};

export const DEFAULT_RESPONSE_DICTIONARY = {
  forbiddenWords: [] as string[],
  requiredWords: [] as Array<{ phrase: string; condition: string }>,
};

export const DEFAULT_RETRIEVAL_CONFIG = {
  topK: 5,
  similarityThreshold: 0.5,
  sourcePriority: "balanced" as const,
  selectionRule: "highest_score" as const,
  maxContextDocuments: 5,
};

/**
 * In-memory cache untuk config (singleton pattern).
 *
 * The cache lives in one process. `saveAiConfig` invalidates its own copy, but
 * a second worker keeps serving its stale one until the TTL lapses — so the TTL
 * is the real upper bound on how long a model change takes to apply everywhere.
 * 30 seconds keeps that window short; the previous 5 minutes meant an admin
 * could switch models and watch requests keep hitting the old one.
 */
let cachedConfig: AiConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 1000;

/**
 * Decrypt a stored key, or drop it if it cannot be read.
 *
 * A key that fails to decrypt (rotated CONFIG_ENCRYPTION_KEY, corrupted row)
 * must not be passed on as-is — that would send ciphertext as a bearer token.
 * Returning undefined lets the env fallback take over instead.
 */
function readSecret(stored: string | null, label: string): string | undefined {
  if (!stored) return undefined;
  try {
    return decryptSecret(stored);
  } catch (error) {
    console.error(
      `[Config] Could not decrypt ${label}; falling back to env.`,
      error,
    );
    return undefined;
  }
}

/**
 * Load config dari database dengan fallback ke environment variables
 * Prioritas: 1) Database (row aktif) > 2) Environment Variables > 3) Default
 */
export async function getAiConfig(): Promise<AiConfig> {
  const now = Date.now();

  // Return cached config jika masih valid
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    // 1. Coba load dari database (row dengan is_active = 'true')
    const activeConfig = await db
      .select()
      .from(appConfig)
      .where(eq(appConfig.isActive, "true"))
      .limit(1);

    if (activeConfig.length > 0 && activeConfig[0]) {
      const config: AiConfig = {
        embeddingBaseUrl: activeConfig[0].embeddingBaseUrl || undefined,
        embeddingModel: activeConfig[0].embeddingModel || undefined,
        embeddingApiKey: readSecret(
          activeConfig[0].embeddingApiKey,
          "embedding API key",
        ),
        llmBaseUrl: activeConfig[0].llmBaseUrl || undefined,
        llmModel: activeConfig[0].llmModel || undefined,
        llmApiKey: readSecret(activeConfig[0].llmApiKey, "LLM API key"),
        aiPersona: activeConfig[0].aiPersona,
        aiTone: activeConfig[0].aiTone,
        aiDetailLevel: activeConfig[0].aiDetailLevel,
        aiLanguage: activeConfig[0].aiLanguage,
        aiUseEmoji: activeConfig[0].aiUseEmoji,
        responseKnowledgeOnly: activeConfig[0].responseKnowledgeOnly,
        responseNoHallucination: activeConfig[0].responseNoHallucination,
        responseFallbackMessage: activeConfig[0].responseFallbackMessage,
        responseForbiddenWords: activeConfig[0].responseForbiddenWords,
        responseRequiredWords: activeConfig[0].responseRequiredWords,
        retrievalTopK: activeConfig[0].retrievalTopK,
        retrievalSimilarityThreshold:
          activeConfig[0].retrievalSimilarityThreshold,
        retrievalSourcePriority: activeConfig[0].retrievalSourcePriority,
        retrievalSelectionRule: activeConfig[0].retrievalSelectionRule,
        retrievalMaxContextDocuments:
          activeConfig[0].retrievalMaxContextDocuments,
      };

      // Merge dengan environment variables sebagai fallback
      cachedConfig = {
        embeddingBaseUrl:
          config.embeddingBaseUrl || process.env.ROUTER_BASE_URL,
        embeddingModel: config.embeddingModel || process.env.EMBEDDING_MODEL,
        embeddingApiKey: config.embeddingApiKey || process.env.ROUTER_API_KEY,
        llmBaseUrl: config.llmBaseUrl || process.env.ROUTER_BASE_URL,
        llmModel: config.llmModel || process.env.LLM_MODEL,
        llmApiKey: config.llmApiKey || process.env.ROUTER_API_KEY,
        aiPersona: config.aiPersona || DEFAULT_AI_BEHAVIOUR.persona,
        aiTone: config.aiTone || DEFAULT_AI_BEHAVIOUR.tone,
        aiDetailLevel: config.aiDetailLevel || DEFAULT_AI_BEHAVIOUR.detailLevel,
        aiLanguage: config.aiLanguage || DEFAULT_AI_BEHAVIOUR.language,
        aiUseEmoji: config.aiUseEmoji ?? DEFAULT_AI_BEHAVIOUR.useEmoji,
        responseKnowledgeOnly:
          config.responseKnowledgeOnly ?? DEFAULT_RESPONSE_RULES.knowledgeOnly,
        responseNoHallucination:
          config.responseNoHallucination ??
          DEFAULT_RESPONSE_RULES.noHallucination,
        responseFallbackMessage:
          config.responseFallbackMessage ||
          DEFAULT_RESPONSE_RULES.fallbackMessage,
        responseForbiddenWords:
          config.responseForbiddenWords ??
          DEFAULT_RESPONSE_DICTIONARY.forbiddenWords,
        responseRequiredWords:
          config.responseRequiredWords ??
          DEFAULT_RESPONSE_DICTIONARY.requiredWords,
        retrievalTopK: config.retrievalTopK ?? DEFAULT_RETRIEVAL_CONFIG.topK,
        retrievalSimilarityThreshold:
          config.retrievalSimilarityThreshold ??
          DEFAULT_RETRIEVAL_CONFIG.similarityThreshold,
        retrievalSourcePriority:
          config.retrievalSourcePriority ??
          DEFAULT_RETRIEVAL_CONFIG.sourcePriority,
        retrievalSelectionRule:
          config.retrievalSelectionRule ??
          DEFAULT_RETRIEVAL_CONFIG.selectionRule,
        retrievalMaxContextDocuments:
          config.retrievalMaxContextDocuments ??
          DEFAULT_RETRIEVAL_CONFIG.maxContextDocuments,
      };

      cacheTimestamp = now;
      return cachedConfig;
    }
  } catch (error) {
    console.error("[Config] Error loading from database:", error);
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
    aiPersona: DEFAULT_AI_BEHAVIOUR.persona,
    aiTone: DEFAULT_AI_BEHAVIOUR.tone,
    aiDetailLevel: DEFAULT_AI_BEHAVIOUR.detailLevel,
    aiLanguage: DEFAULT_AI_BEHAVIOUR.language,
    aiUseEmoji: DEFAULT_AI_BEHAVIOUR.useEmoji,
    responseKnowledgeOnly: DEFAULT_RESPONSE_RULES.knowledgeOnly,
    responseNoHallucination: DEFAULT_RESPONSE_RULES.noHallucination,
    responseFallbackMessage: DEFAULT_RESPONSE_RULES.fallbackMessage,
    responseForbiddenWords: DEFAULT_RESPONSE_DICTIONARY.forbiddenWords,
    responseRequiredWords: DEFAULT_RESPONSE_DICTIONARY.requiredWords,
    retrievalTopK: DEFAULT_RETRIEVAL_CONFIG.topK,
    retrievalSimilarityThreshold: DEFAULT_RETRIEVAL_CONFIG.similarityThreshold,
    retrievalSourcePriority: DEFAULT_RETRIEVAL_CONFIG.sourcePriority,
    retrievalSelectionRule: DEFAULT_RETRIEVAL_CONFIG.selectionRule,
    retrievalMaxContextDocuments: DEFAULT_RETRIEVAL_CONFIG.maxContextDocuments,
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
 * Remove all database-backed AI configuration revisions.
 *
 * Revisions intentionally carry encrypted credentials forward. Deleting only
 * the active row would leave those credentials recoverable from older rows and
 * could also make an arbitrary stale revision look like a viable replacement.
 * A reset therefore removes the complete revision set atomically; subsequent
 * reads use environment variables and safe defaults.
 */
export async function deleteAiConfig(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('ai-config-save'))`,
    );
    await tx.delete(appConfig);
  });

  invalidateConfigCache();
}

/**
 * Simpan config baru ke database
 * - Set row lama is_active = 'false'
 * - Insert row baru dengan is_active = 'true'
 *
 * API keys are encrypted before they touch the row. Because each save inserts a
 * new row rather than updating in place (the table doubles as an audit trail),
 * an omitted key has to be carried forward explicitly — otherwise editing just
 * the model name would drop the key from the new active row.
 */
export async function saveAiConfig(
  config: AiConfig,
  updatedBy?: string,
): Promise<void> {
  const now = new Date();

  /**
   * undefined -> keep whatever is already stored (still encrypted, no re-crypt)
   * ''        -> explicit clear
   * value     -> encrypt the new secret
   */
  const nextSecret = (
    incoming: string | undefined,
    stored: string | null,
  ): string | null => {
    if (incoming === undefined) return stored ?? null;
    if (incoming === "") return null;
    return encryptSecret(incoming);
  };

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('ai-config-save'))`,
    );

    // Read the outgoing row in the same transaction so undefined secrets and
    // behaviour fields can be preserved without leaving zero active rows if
    // insertion of the replacement fails.
    const [current] = await tx
      .select()
      .from(appConfig)
      .where(eq(appConfig.isActive, "true"))
      .limit(1);

    await tx
      .update(appConfig)
      .set({ isActive: "false", updatedAt: now })
      .where(eq(appConfig.isActive, "true"));

    await tx.insert(appConfig).values({
      embeddingBaseUrl: config.embeddingBaseUrl || null,
      embeddingModel: config.embeddingModel || null,
      embeddingApiKey: nextSecret(
        config.embeddingApiKey,
        current?.embeddingApiKey ?? null,
      ),
      llmBaseUrl: config.llmBaseUrl || null,
      llmModel: config.llmModel || null,
      llmApiKey: nextSecret(config.llmApiKey, current?.llmApiKey ?? null),
      aiPersona:
        config.aiPersona ?? current?.aiPersona ?? DEFAULT_AI_BEHAVIOUR.persona,
      aiTone: config.aiTone ?? current?.aiTone ?? DEFAULT_AI_BEHAVIOUR.tone,
      aiDetailLevel:
        config.aiDetailLevel ??
        current?.aiDetailLevel ??
        DEFAULT_AI_BEHAVIOUR.detailLevel,
      aiLanguage:
        config.aiLanguage ??
        current?.aiLanguage ??
        DEFAULT_AI_BEHAVIOUR.language,
      aiUseEmoji:
        config.aiUseEmoji ??
        current?.aiUseEmoji ??
        DEFAULT_AI_BEHAVIOUR.useEmoji,
      responseKnowledgeOnly:
        config.responseKnowledgeOnly ??
        current?.responseKnowledgeOnly ??
        DEFAULT_RESPONSE_RULES.knowledgeOnly,
      responseNoHallucination:
        config.responseNoHallucination ??
        current?.responseNoHallucination ??
        DEFAULT_RESPONSE_RULES.noHallucination,
      responseFallbackMessage:
        config.responseFallbackMessage ??
        current?.responseFallbackMessage ??
        DEFAULT_RESPONSE_RULES.fallbackMessage,
      responseForbiddenWords:
        config.responseForbiddenWords ??
        current?.responseForbiddenWords ??
        DEFAULT_RESPONSE_DICTIONARY.forbiddenWords,
      responseRequiredWords:
        config.responseRequiredWords ??
        current?.responseRequiredWords ??
        DEFAULT_RESPONSE_DICTIONARY.requiredWords,
      retrievalTopK:
        config.retrievalTopK ??
        current?.retrievalTopK ??
        DEFAULT_RETRIEVAL_CONFIG.topK,
      retrievalSimilarityThreshold:
        config.retrievalSimilarityThreshold ??
        current?.retrievalSimilarityThreshold ??
        DEFAULT_RETRIEVAL_CONFIG.similarityThreshold,
      retrievalSourcePriority:
        config.retrievalSourcePriority ??
        current?.retrievalSourcePriority ??
        DEFAULT_RETRIEVAL_CONFIG.sourcePriority,
      retrievalSelectionRule:
        config.retrievalSelectionRule ??
        current?.retrievalSelectionRule ??
        DEFAULT_RETRIEVAL_CONFIG.selectionRule,
      retrievalMaxContextDocuments:
        config.retrievalMaxContextDocuments ??
        current?.retrievalMaxContextDocuments ??
        DEFAULT_RETRIEVAL_CONFIG.maxContextDocuments,
      isActive: "true",
      updatedBy: updatedBy
        ? (updatedBy as unknown as import("@/lib/schema").User["id"])
        : null,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Invalidate cache
  invalidateConfigCache();
}

/**
 * Read and discard the body of a successful probe.
 *
 * Deliberately does not JSON.parse. A 2xx already answers the only question a
 * connection test asks — is the endpoint reachable and the key accepted — and
 * some OpenAI-compatible gateways append a stray `data: [DONE]` after the JSON
 * object even for non-streaming calls. Parsing strictly turned that into
 * "Unexpected non-whitespace character after JSON", so the LLM test always
 * failed against a perfectly working endpoint.
 */
async function drainBody(response: Response): Promise<void> {
  await response.text().catch(() => "");
}

/**
 * Test koneksi ke endpoint AI
 */
export async function testConnection(
  type: "embedding" | "llm",
  baseUrl: string,
  apiKey?: string,
  model?: string,
): Promise<{ success: boolean; error?: string; latency?: number }> {
  try {
    const startTime = Date.now();

    if (type === "embedding") {
      // Test embedding endpoint
      const testPayload = {
        input: "test",
        model: model || "text-embedding-ada-002",
      };

      const response = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      await drainBody(response);
    } else {
      // Test LLM endpoint
      const testPayload = {
        messages: [{ role: "user", content: "Hello" }],
        model: model || "gpt-4o-mini",
        max_tokens: 1,
      };

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      await drainBody(response);
    }

    const latency = Date.now() - startTime;
    return { success: true, latency };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
