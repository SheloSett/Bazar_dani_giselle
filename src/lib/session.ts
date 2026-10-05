// Helpers de sesión para route handlers (Node)
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE_S } from '@/lib/auth';
import { newSessionToken, verifySession } from '@/lib/credentials';
import { isCrossOrigin } from '@/lib/origin';

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

// Para las rutas del panel que cambian algo (POST, PATCH, DELETE): devuelve el
// rechazo listo si el pedido viene de otro origen o no hay sesión, o null si puede
// seguir. Va en cada ruta y no en el middleware (ver lib/origin.ts).
export async function denyAdminWrite(req: NextRequest): Promise<NextResponse | null> {
  if (isCrossOrigin(req.headers))
    return NextResponse.json({ error: 'Pedido de otro origen' }, { status: 403 });
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return null;
}

// Para las páginas del panel: el middleware ya las protege, pero cada una verifica
// la sesión por su cuenta, por si el middleware llegara a fallar o a saltearse
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}

function isHttps(req: NextRequest): boolean {
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  return proto === 'https' || req.nextUrl.protocol === 'https:';
}

// Emite una cookie de sesión nueva, firmada con la clave vigente
export async function setSessionCookie(res: NextResponse, req: NextRequest): Promise<void> {
  res.cookies.set(SESSION_COOKIE, await newSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
    // Detrás de HTTPS (dominio + Caddy) la cookie viaja solo cifrada
    secure: isHttps(req),
  });
}
