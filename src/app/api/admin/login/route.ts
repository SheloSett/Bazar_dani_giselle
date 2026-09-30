import { NextRequest, NextResponse } from 'next/server';
import { authConfigError } from '@/lib/auth';
import { checkPassword, getCredential } from '@/lib/credentials';
import { loginLimiter } from '@/lib/rate-limit';
import { setSessionCookie } from '@/lib/session';

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'desconocida'
  );
}

export async function POST(req: NextRequest) {
  const configError = authConfigError();
  if (configError) return NextResponse.json({ error: configError }, { status: 500 });

  const cred = await getCredential();
  if (!cred) {
    return NextResponse.json(
      { error: 'Falta configurar ADMIN_PASSWORD en el servidor' },
      { status: 500 }
    );
  }

  const ip = clientIp(req);
  const wait = loginLimiter.retryAfter(ip);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return NextResponse.json(
      {
        error: `Demasiados intentos. Probá de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
      },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body?.password !== 'string' || !(await checkPassword(cred, body.password))) {
    loginLimiter.fail(ip);
    return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });
  }

  loginLimiter.succeed(ip);
  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, req);
  return res;
}
