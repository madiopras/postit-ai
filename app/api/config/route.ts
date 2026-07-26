import { NextRequest, NextResponse } from 'next/server';
import { getAiConfig, saveAiConfig } from '@/lib/config';
import { requireAuth } from '@/lib/auth';

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
          hasApiKey: !!config.embeddingApiKey,
        },
        llm: {
          baseUrl: config.llmBaseUrl || '',
          model: config.llmModel || '',
          hasApiKey: !!config.llmApiKey,
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

    const body = await req.json();
    const { embedding, llm } = body;

    // Validate input
    if (!embedding || !llm) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing embedding or llm config' } },
        { status: 400 }
      );
    }

    const config = {
      embeddingBaseUrl: embedding.baseUrl || null,
      embeddingModel: embedding.model || null,
      embeddingApiKey: embedding.apiKey || null,
      llmBaseUrl: llm.baseUrl || null,
      llmModel: llm.model || null,
      llmApiKey: llm.apiKey || null,
    };

    await saveAiConfig(config, auth.session.userId);

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    console.error('[Config API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}