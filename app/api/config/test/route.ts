import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAiConfig, testConnection } from '@/lib/config';
import { requireAuth } from '@/lib/auth';

const testSchema = z.object({
  type: z.enum(['embedding', 'llm']),
  baseUrl: z.string().trim().min(1, 'baseUrl is required').max(500),
  model: z.string().trim().max(200).optional(),
  /** Omitted means "use the key already saved" — see below. */
  apiKey: z.string().max(500).optional(),
});

/**
 * POST /api/config/test
 * Test connection to AI endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const parsed = testSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message ?? 'Invalid request',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { type, baseUrl, model, apiKey } = parsed.data;

    // The form never receives the stored key back, so a test run after saving
    // would otherwise go out unauthenticated and fail with a misleading 401.
    // An explicitly typed key still wins, so a new one can be tried before it
    // is committed.
    let effectiveKey = apiKey;
    if (!effectiveKey) {
      const stored = await getAiConfig();
      effectiveKey = type === 'embedding' ? stored.embeddingApiKey : stored.llmApiKey;
    }

    const result = await testConnection(type, baseUrl, effectiveKey, model);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONNECTION_ERROR', message: result.error || 'Failed to connect' },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Connection to ${type} endpoint successful`,
      data: { latency: result.latency },
    });
  } catch (error) {
    console.error('[Config Test API] POST error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
