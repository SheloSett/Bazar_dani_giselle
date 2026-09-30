import { NextRequest, NextResponse } from 'next/server';
import { createToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: 'Falta configurar ADMIN_PASSWORD en el servidor' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.password !== 'string' || body.password !== adminPassword) {
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    // secure: true  ← activar cuando el sitio esté detrás de HTTPS (dominio + Caddy)
  });
  return res;
}
