import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  users,
  USER_ROLES,
  type UserRole,
  type UserStatus,
} from '@/lib/schema';

let cachedSecret: Uint8Array | null = null;

/**
 * Resolve the JWT signing secret.
 *
 * There is deliberately no fallback value: a hardcoded default would let anyone
 * who can read this repository forge an admin token. Resolved lazily rather than
 * at import time so that `next build` does not require the secret to be present.
 */
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env'
    );
  }

  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export interface AuthPayload extends JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  displayName?: string;
}

// ─── Hash & Compare ────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ────────────────────────────────────────────────
export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(
  token: string
): Promise<AuthPayload | null> {
  // Resolved outside the try so a missing JWT_SECRET surfaces as a configuration
  // error instead of being swallowed as "invalid token".
  const secret = getSecret();

  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.role !== 'string' ||
      !USER_ROLES.includes(payload.role as UserRole)
    ) {
      return null;
    }

    return {
      ...payload,
      userId: payload.userId,
      username: payload.username,
      role: payload.role as UserRole,
      // Older tokens predate account status. The database lookup performed for
      // every authenticated request below is authoritative.
      status: payload.status === 'inactive' || payload.status === 'blocked'
        ? payload.status
        : 'active',
      displayName: typeof payload.displayName === 'string'
        ? payload.displayName
        : undefined,
    };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ─────────────────────────────────────
export const COOKIE_NAME = 'simpleai_token';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// ─── Route handler guard ────────────────────────────────
export type AuthResult =
  | { ok: true; session: AuthPayload }
  | { ok: false; response: NextResponse };

export type OptionalAuthResult =
  | { ok: true; session: AuthPayload | null }
  | { ok: false; response: NextResponse };

/** Roles that may use the operational administration dashboard. */
export const DASHBOARD_ROLES = ['super_admin', 'admin'] as const satisfies readonly UserRole[];

/** AI configuration is deliberately restricted to the highest privilege. */
export const SUPER_ADMIN_ONLY = ['super_admin'] as const satisfies readonly UserRole[];

/**
 * Revalidate a signed token against the current user row.
 *
 * JWTs live for seven days, but role and account-status changes must take
 * effect immediately. The database is therefore authoritative on every
 * authenticated request; claims only identify which account to load.
 */
export async function authenticateToken(token: string): Promise<AuthResult> {
  const claims = await verifyToken(token);
  if (!claims) {
    return { ok: false, response: unauthorized('Invalid session') };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, claims.userId),
  });

  if (!user) {
    return { ok: false, response: unauthorized('Invalid session') };
  }

  if (user.status === 'blocked') {
    return {
      ok: false,
      response: forbidden('ACCOUNT_BLOCKED', 'Account is blocked'),
    };
  }

  if (user.status === 'inactive') {
    return {
      ok: false,
      response: forbidden('ACCOUNT_INACTIVE', 'Account is inactive'),
    };
  }

  return {
    ok: true,
    session: {
      ...claims,
      userId: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      displayName: user.displayName ?? undefined,
    },
  };
}

/**
 * Guard an admin route handler.
 *
 * `proxy.ts` already redirects unauthenticated page requests, but it is an
 * optimistic check only — it never sees requests that bypass it, and Next.js
 * documents Proxy as unsuitable for authorization on its own. Every mutating
 * API route calls this so that authentication is enforced at the handler too.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   // auth.session is available from here
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return { ok: false, response: unauthorized('Login required') };
  }

  return authenticateToken(token);
}

/**
 * Resolve a session on a public route without making login mandatory.
 *
 * Missing cookies are anonymous. A supplied but invalid, inactive, or blocked
 * session is rejected rather than silently downgraded, so account enforcement
 * cannot be bypassed by retaining a stale cookie.
 */
export async function optionalAuth(req: NextRequest): Promise<OptionalAuthResult> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return { ok: true, session: null };
  return authenticateToken(token);
}

/** Require authentication plus one of the explicitly allowed roles. */
export async function requireRole(
  req: NextRequest,
  allowedRoles: readonly UserRole[]
): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (!allowedRoles.includes(auth.session.role)) {
    return {
      ok: false,
      response: forbidden('FORBIDDEN', 'You do not have permission to perform this action'),
    };
  }

  return auth;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}

function forbidden(code: string, message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status: 403 }
  );
}
