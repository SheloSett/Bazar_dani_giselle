import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { isCrossOrigin } from '@/lib/origin';

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req.headers))
    return NextResponse.json({ error: 'Pedido de otro origen' }, { status: 403 });
  // Responde a un <form method="post">: borra la cookie y vuelve al login
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
