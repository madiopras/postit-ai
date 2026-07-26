import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/config';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/config/test
 * Test connection to AI endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { type, baseUrl, apiKey, model } = body;

    // Validate input
    if (!type || !baseUrl) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'type and baseUrl are required' } },
        { status: 400 }
      );
    }

    if (!['embedding', 'llm'].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'type must be "embedding" or "llm"' } },
        { status: 400 }
      );
    }

    // Test connection
    const result = await testConnection(
      type as 'embedding' | 'llm',
      baseUrl,
      apiKey,
      model
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Connection to ${type} endpoint successful`,
        data: {
          latency: result.latency,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: result.error || 'Failed to connect',
        },
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[Config Test API] POST error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}