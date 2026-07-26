import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

/**
 * Paths reachable without a session.
 *
 * This is an explicit allow-list: anything not listed here requires a valid JWT.
 * The previous deny-list let every `/api/*` route through on the assumption that
 * each handler checked auth itself, which only `/api/config*` actually did.
 *
 * Matching is exact, so new public routes must be added deliberately.
 */
const PUBLIC_PATHS = new Set([
  '/', // public chat — no login by design (prd.md §2)
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/chat', // public chat backend
  '/api/chat/sessions', // a visitor's own conversation list
]);

/**
 * Public routes with a dynamic segment, matched by prefix.
 *
 * These are reachable without a session but are not unguarded: each handler
 * requires a matching `visitorId` and answers 404 when it does not own the
 * record, so conversation ids cannot be enumerated.
 */
const PUBLIC_PREFIXES = [
  '/api/chat/sessions/', // GET/DELETE one conversation
  '/api/feedback/', // PATCH thumbs up/down on an answer
];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

/** Headers the app derives from the session; never trust them from the client. */
const SESSION_HEADERS = ['x-user-id', 'x-user-role'] as const;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip client-supplied session headers on every request so they can only ever
  // be set below, from a verified token.
  const requestHeaders = new Headers(request.headers);
  for (const header of SESSION_HEADERS) {
    requestHeaders.delete(header);
  }

  if (isPublic(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isApiRoute = pathname.startsWith('/api/');
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    // API clients get a JSON 401; redirecting them to an HTML login page would
    // surface as an unparseable 200 response.
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next.js internals and static assets.
     * `/api/*` is deliberately included — it is protected by the allow-list above.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
