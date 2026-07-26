import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAiConfig, saveAiConfig } from '@/lib/config';
import { requireAuth } from '@/lib/auth';
import { maskSecret } from '@/lib/crypto';

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

const configSchema = z.object({
  embedding: endpointSchema,
  llm: endpointSchema,
});

/**
 * GET /api/config
 * Get current AI configuration
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
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
    const auth = await requireAuth(req);
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

    const { embedding, llm } = parsed.data;

    await saveAiConfig(
      {
        embeddingBaseUrl: embedding.baseUrl || undefined,
        embeddingModel: embedding.model || undefined,
        embeddingApiKey: embedding.apiKey,
        llmBaseUrl: llm.baseUrl || undefined,
        llmModel: llm.model || undefined,
        llmApiKey: llm.apiKey,
      },
      auth.session.userId
    );

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
