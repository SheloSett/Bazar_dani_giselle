import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { confirmOrder, deleteOrder, unconfirmOrder } from '@/lib/orders';
import { parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// Marcar o desmarcar el pedido como confirmado: { confirmed: true | false }.
// Confirmar descuenta el stock; si no alcanza responde 409 con los productos que
// faltan, y con { force: true } confirma igual. Desmarcar devuelve lo descontado.
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (typeof body?.confirmed !== 'boolean')
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  if (!body.confirmed) {
    if (!(await unconfirmOrder(id)))
      return NextResponse.json({ error: 'No existe' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const result = await confirmOrder(id, body.force === true);
  if (result.status === 'missing')
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  if (result.status === 'short')
    return NextResponse.json(
      { error: 'No alcanza el stock', short: result.short },
      { status: 409 }
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id || !(await deleteOrder(id)))
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
