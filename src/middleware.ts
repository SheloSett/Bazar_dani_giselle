import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { verifySession } from '@/lib/credentials';

// Protege las páginas del panel con la cookie de sesión. La API del panel
// (/api/admin) NO pasa por acá a propósito: cada ruta verifica la sesión y el
// origen por su cuenta (denyAdminWrite). Lo que pasa por el middleware lleva su
// cuerpo copiado por Next, y las fotos de más de 2 o 3 MB llegaban rotas a la
// ruta más o menos la mitad de las veces ("No llegó ninguna imagen").
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // El optimizador de imágenes de Next no se usa: cerrado del todo
  if (pathname === '/_next/image') return new NextResponse(null, { status: 404 });

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
  // Sin /api: ver el comentario de arriba
  matcher: ['/admin/:path*', '/_next/image'],
  // Node en vez de edge: la sesión se valida contra la clave guardada en la base
  runtime: 'nodejs',
};
