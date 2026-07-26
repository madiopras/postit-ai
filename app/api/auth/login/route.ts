import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { comparePassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role || 'admin',
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
      },
    }, { headers });
  } catch (err) {
    console.error('Login error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}