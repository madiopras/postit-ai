import { COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );

  return Response.json({ ok: true }, { headers });
}