import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ok = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);

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
  matcher: ['/admin/:path*'],
};
