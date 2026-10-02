import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { deleteOrder, setOrderConfirmed } from '@/lib/orders';
import { parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// Marcar o desmarcar el pedido como confirmado: { confirmed: true | false }
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (typeof body?.confirmed !== 'boolean')
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  if (!(await setOrderConfirmed(id, body.confirmed)))
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = parseId((await params).id);
  if (!id || !(await deleteOrder(id)))
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
