import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, requireAuth } from '@/lib/auth';

/** Return the current database-backed identity without exposing token claims. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    auth.response.cookies.delete(COOKIE_NAME);
    return auth.response;
  }

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
