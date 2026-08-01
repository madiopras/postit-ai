import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteAiConfig, getAiConfig, saveAiConfig } from '@/lib/config';
import { requireRole, SUPER_ADMIN_ONLY } from '@/lib/auth';
import { maskSecret } from '@/lib/crypto';
import { recordAuditEvent } from '@/lib/audit';

/**
 * `apiKey` is deliberately optional and nullable:
 *   omitted -> keep the stored key (the form never receives it, so a save that
 *              only changes the model must not wipe it)
 *   ''      -> clear the key
 *   value   -> replace it
 */
const endpointSchema = z.object({
  baseUrl: z.string().trim().max(500),
  model: z.string().trim().max(200),
  apiKey: z.string().max(500).optional(),
});

const phraseSchema = z.string().trim().min(1).max(200);
const responseDictionarySchema = z.object({
  forbiddenWords: z.array(phraseSchema).max(100).refine(
    (items) => new Set(items.map((item) => item.toLocaleLowerCase())).size === items.length,
    'Forbidden phrases must be unique'
  ),
  requiredWords: z.array(z.object({
    phrase: phraseSchema,
    condition: z.string().trim().max(200),
  })).max(100).refine(
    (items) => new Set(
      items.map((item) => `${item.phrase}\u0000${item.condition}`.toLocaleLowerCase())
    ).size === items.length,
    'Required phrase rules must be unique'
  ),
});

const configSchema = z.object({
  embedding: endpointSchema,
  llm: endpointSchema,
  behaviour: z.object({
    persona: z.string().trim().min(1).max(2000),
    tone: z.enum(['formal', 'professional', 'friendly']),
    detailLevel: z.enum(['concise', 'medium', 'detailed']),
    language: z.enum(['same_as_user', 'id', 'en']),
    useEmoji: z.boolean(),
  }).optional(),
  responseRules: z.object({
    knowledgeOnly: z.boolean(),
    noHallucination: z.boolean(),
    fallbackMessage: z.string().trim().min(1).max(2000),
  }).optional(),
  responseDictionary: responseDictionarySchema.optional(),
  retrieval: z.object({
    topK: z.number().int().min(1).max(50),
    similarityThreshold: z.number().min(0).max(1),
    sourcePriority: z.enum(['balanced', 'faq_first', 'sop_first']),
    selectionRule: z.enum(['highest_score', 'diverse_sources']),
    maxContextDocuments: z.number().int().min(1).max(20),
  }).optional(),
}).superRefine((config, context) => {
  const forbidden = config.responseDictionary?.forbiddenWords ?? [];
  const required = config.responseDictionary?.requiredWords ?? [];
  for (const rule of required) {
    const requiredPhrase = rule.phrase.toLocaleLowerCase();
    const conflict = forbidden.find((phrase) =>
      requiredPhrase.includes(phrase.toLocaleLowerCase())
    );
    if (conflict) {
      context.addIssue({
        code: 'custom',
        path: ['responseDictionary', 'requiredWords'],
        message: `Required phrase "${rule.phrase}" conflicts with forbidden phrase "${conflict}"`,
      });
    }
  }
  if (
    config.retrieval
    && config.retrieval.maxContextDocuments > config.retrieval.topK
  ) {
    context.addIssue({
      code: 'custom',
      path: ['retrieval', 'maxContextDocuments'],
      message: 'Maximum context documents cannot exceed Top K',
    });
  }
});

/**
 * GET /api/config
 * Get current AI configuration
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    const config = await getAiConfig();

    return NextResponse.json({
      success: true,
      data: {
        embedding: {
          baseUrl: config.embeddingBaseUrl || '',
          model: config.embeddingModel || '',
          hasApiKey: Boolean(config.embeddingApiKey),
          // A masked preview, never the key itself — enough to tell which
          // credential is configured without handing it back to the browser.
          apiKeyPreview: maskSecret(config.embeddingApiKey ?? ''),
        },
        llm: {
          baseUrl: config.llmBaseUrl || '',
          model: config.llmModel || '',
          hasApiKey: Boolean(config.llmApiKey),
          apiKeyPreview: maskSecret(config.llmApiKey ?? ''),
        },
        behaviour: {
          persona: config.aiPersona,
          tone: config.aiTone,
          detailLevel: config.aiDetailLevel,
          language: config.aiLanguage,
          useEmoji: config.aiUseEmoji,
        },
        responseRules: {
          knowledgeOnly: config.responseKnowledgeOnly,
          noHallucination: config.responseNoHallucination,
          fallbackMessage: config.responseFallbackMessage,
          // Authentication and document access are security boundaries, not
          // optional prompt preferences.
          enforceDocumentAccess: true,
        },
        responseDictionary: {
          forbiddenWords: config.responseForbiddenWords,
          requiredWords: config.responseRequiredWords,
        },
        retrieval: {
          topK: config.retrievalTopK,
          similarityThreshold: config.retrievalSimilarityThreshold,
          sourcePriority: config.retrievalSourcePriority,
          selectionRule: config.retrievalSelectionRule,
          maxContextDocuments: config.retrievalMaxContextDocuments,
        },
        // Tampilkan fallback values dari env
        fallback: {
          embeddingBaseUrl: process.env.ROUTER_BASE_URL || '',
          embeddingModel: process.env.EMBEDDING_MODEL || '',
          llmBaseUrl: process.env.ROUTER_BASE_URL || '',
          llmModel: process.env.LLM_MODEL || '',
        },
      },
    });
  } catch (error) {
    console.error('[Config API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config
 * Update AI configuration
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    const parsed = configSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid configuration',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const {
      embedding,
      llm,
      behaviour,
      responseRules,
      responseDictionary,
      retrieval,
    } = parsed.data;

    await saveAiConfig(
      {
        embeddingBaseUrl: embedding.baseUrl || undefined,
        embeddingModel: embedding.model || undefined,
        embeddingApiKey: embedding.apiKey,
        llmBaseUrl: llm.baseUrl || undefined,
        llmModel: llm.model || undefined,
        llmApiKey: llm.apiKey,
        aiPersona: behaviour?.persona,
        aiTone: behaviour?.tone,
        aiDetailLevel: behaviour?.detailLevel,
        aiLanguage: behaviour?.language,
        aiUseEmoji: behaviour?.useEmoji,
        responseKnowledgeOnly: responseRules?.knowledgeOnly,
        responseNoHallucination: responseRules?.noHallucination,
        responseFallbackMessage: responseRules?.fallbackMessage,
        responseForbiddenWords: responseDictionary?.forbiddenWords,
        responseRequiredWords: responseDictionary?.requiredWords,
        retrievalTopK: retrieval?.topK,
        retrievalSimilarityThreshold: retrieval?.similarityThreshold,
        retrievalSourcePriority: retrieval?.sourcePriority,
        retrievalSelectionRule: retrieval?.selectionRule,
        retrievalMaxContextDocuments: retrieval?.maxContextDocuments,
      },
      auth.session.userId
    );

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'ai_config.save',
      entityType: 'ai_configuration',
      metadata: {
        sections: [
          'model',
          ...(behaviour ? ['behaviour'] : []),
          ...(responseRules ? ['response_rules'] : []),
          ...(responseDictionary ? ['response_dictionary'] : []),
          ...(retrieval ? ['retrieval'] : []),
        ],
        embeddingApiKeyChanged: embedding.apiKey !== undefined,
        llmApiKeyChanged: llm.apiKey !== undefined,
      },
    });
    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    console.error('[Config API] PUT error:', error);

    // A missing CONFIG_ENCRYPTION_KEY is an operator problem, not a bug —
    // say so instead of returning a generic 500.
    const message =
      error instanceof Error && error.message.includes('CONFIG_ENCRYPTION_KEY')
        ? error.message
        : 'Internal server error';

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/config
 * Remove all persisted revisions and return runtime configuration to
 * environment variables and application defaults.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, SUPER_ADMIN_ONLY);
    if (!auth.ok) return auth.response;

    await deleteAiConfig();

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'ai_config.delete',
      entityType: 'ai_configuration',
    });
    return NextResponse.json({
      success: true,
      message: 'Persisted AI configuration deleted',
    });
  } catch (error) {
    console.error('[Config API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
