import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/** Return the current database-backed identity without exposing token claims. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { userId, username, displayName, role, status } = auth.session;
  return NextResponse.json({
    success: true,
    data: {
      id: userId,
      username,
      displayName: displayName ?? null,
      role,
      status,
    },
  });
}
