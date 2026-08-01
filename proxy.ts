import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateToken, COOKIE_NAME } from '@/lib/auth';

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
  '/api/health',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me', // optional identity probe; handler still validates the cookie
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
  // The Phase 1 component smoke surface is intentionally reachable only from
  // `next dev`. Its page also calls `notFound()` in production, so this does not
  // widen the deployed public route set.
  const isDevelopmentSmokeSurface =
    process.env.NODE_ENV === 'development' &&
    pathname === '/dev/ui-foundation';

  return (
    isDevelopmentSmokeSurface ||
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
  const auth = token ? await authenticateToken(token) : null;
  const session = auth?.ok ? auth.session : null;

  if (!session) {
    // API clients get a JSON 401; redirecting them to an HTML login page would
    // surface as an unparseable 200 response.
    if (isApiRoute) {
      if (auth && !auth.ok) return auth.response;
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  const isSuperAdminPage =
    pathname === '/dashboard/config' ||
    pathname.startsWith('/dashboard/config/') ||
    pathname === '/dashboard/audit-logs' ||
    pathname.startsWith('/dashboard/audit-logs/') ||
    pathname === '/dashboard/admins' ||
    pathname.startsWith('/dashboard/admins/');

  if (isSuperAdminPage && session.role !== 'super_admin') {
    return NextResponse.redirect(new URL(session.role === 'user' ? '/' : '/dashboard', request.url));
  }

  if (pathname.startsWith('/dashboard') && session.role === 'user') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next.js internals and static files.
     * `/api/*` is deliberately included — it is protected by the allow-list above.
     *
     * The trailing extension group covers everything served from public/. Without
     * it those files fall through to the allow-list, which does not name them, so
     * every image, favicon, robots.txt and manifest was answered with a 302 to
     * /login. It went unnoticed only because public/ held nothing the app used.
     */
    '/((?!_next/static|_next/image|.*\\.(?:webp|avif|png|jpe?g|gif|svg|ico|webmanifest|txt|xml|woff2?)$).*)',
  ],
};
