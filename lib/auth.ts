import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

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
  role: string;
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
    return payload as unknown as AuthPayload;
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

  const session = await verifyToken(token);
  if (!session) {
    return { ok: false, response: unauthorized('Invalid session') };
  }

  return { ok: true, session };
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}