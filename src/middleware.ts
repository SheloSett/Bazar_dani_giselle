import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { verifySession } from '@/lib/credentials';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Un pedido que cambia algo en el panel tiene que salir del propio sitio. La cookie
// SameSite=Lax ya frena a otros sitios; esto cubre además a otras aplicaciones que
// compartan el dominio o la IP, que para el navegador son "el mismo sitio".
function isCrossOrigin(req: NextRequest): boolean {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return true;

  const origin = req.headers.get('origin');
  if (!origin) return false; // no viene de un navegador: no hay a quién engañar
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // El optimizador de imágenes de Next no se usa: cerrado del todo
  if (pathname === '/_next/image') return new NextResponse(null, { status: 404 });

  // API del panel: acá solo se controla el origen; la sesión la verifica cada ruta
  if (pathname.startsWith('/api/admin')) {
    if (!SAFE_METHODS.has(req.method) && isCrossOrigin(req))
      return NextResponse.json({ error: 'Pedido de otro origen' }, { status: 403 });
    return NextResponse.next();
  }

  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/admin/login') {
    // Si ya está logueado, directo al panel
    return ok
      ? NextResponse.redirect(new URL('/admin', req.url))
      : NextResponse.next();
  }

  return ok
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/_next/image'],
  // Node en vez de edge: la sesión se valida contra la clave guardada en la base
  runtime: 'nodejs',
};
