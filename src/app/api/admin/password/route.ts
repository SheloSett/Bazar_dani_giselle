import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, setSessionCookie } from '@/lib/session';
import { setPassword, verifyPassword } from '@/lib/credentials';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/password';

// Cambia la clave del admin. Se guarda hasheada en la base y pasa a valer en
// lugar de ADMIN_PASSWORD del .env. Cierra las sesiones de los demás
// dispositivos y renueva la de este navegador.
export async function POST(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const current = typeof body?.current === 'string' ? body.current : '';
  const next = typeof body?.next === 'string' ? body.next : '';

  if (next.length < MIN_PASSWORD_LENGTH)
    return NextResponse.json(
      { error: `La clave nueva tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
      { status: 400 }
    );
  if (next.length > MAX_PASSWORD_LENGTH)
    return NextResponse.json({ error: 'La clave nueva es demasiado larga' }, { status: 400 });
  if (next === current)
    return NextResponse.json(
      { error: 'La clave nueva tiene que ser distinta de la actual' },
      { status: 400 }
    );
  if (!(await verifyPassword(current)))
    return NextResponse.json({ error: 'La clave actual no es correcta' }, { status: 400 });

  await setPassword(next);

  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, req);
  return res;
}
