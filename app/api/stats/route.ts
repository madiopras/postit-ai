import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/stats';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/stats
 * Aggregates for the admin dashboard overview.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    return NextResponse.json({ success: true, data: await getDashboardStats() });
  } catch (error) {
    console.error('[Stats API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
