import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { comparePassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const loginSchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(1_024),
  })
  .strict();

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }
    const { username, password } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status === 'blocked') {
      return Response.json(
        { error: 'Account is blocked', code: 'ACCOUNT_BLOCKED' },
        { status: 403 }
      );
    }

    if (user.status === 'inactive') {
      return Response.json(
        { error: 'Account is inactive', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      displayName: user.displayName ?? undefined,
    });

    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; SameSite=Lax${COOKIE_OPTIONS.secure ? '; Secure' : ''}`
    );

    return Response.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
      },
    }, { headers });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
