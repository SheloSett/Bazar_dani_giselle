import { NextRequest, NextResponse } from 'next/server';
import { authConfigError } from '@/lib/auth';
import { checkPassword, getCredential } from '@/lib/credentials';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { bodyWithin, clientIp, loginLimiter } from '@/lib/rate-limit';
import { setSessionCookie } from '@/lib/session';

// Una clave entra de sobra en 2 KB; cualquier cosa más grande no es un login
const MAX_BODY_BYTES = 2_000;

export async function POST(req: NextRequest) {
  if (!bodyWithin(req.headers, MAX_BODY_BYTES))
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 413 });

  const configError = authConfigError();
  if (configError) return NextResponse.json({ error: configError }, { status: 500 });

  const cred = await getCredential();
  if (!cred) {
    return NextResponse.json(
      { error: 'Falta configurar ADMIN_PASSWORD en el servidor' },
      { status: 500 }
    );
  }
  // En producción la clave inicial del .env no puede ser corta ("admin", "1234"):
  // es lo primero que prueba cualquiera y el límite de intentos no sirve contra eso.
  // La que se cambia desde el panel ya exige el mismo mínimo.
  if (
    cred.kind === 'env' &&
    process.env.NODE_ENV === 'production' &&
    cred.password.length < MIN_PASSWORD_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `La clave inicial del servidor (ADMIN_PASSWORD) tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      },
      { status: 500 }
    );
  }

  const ip = clientIp(req.headers);
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
