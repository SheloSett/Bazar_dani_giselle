import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Responde a un <form method="post">: borra la cookie y vuelve al login
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303);
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
