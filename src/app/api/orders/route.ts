import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders';
import { clientIp, orderLimiter } from '@/lib/rate-limit';
import {
  ORDER_TOKEN_RE,
  parseCustomerName,
  parseCustomerPhone,
  parseOrderItems,
} from '@/lib/validate';

// Guarda el pedido que alguien arma en el catálogo: queda en el panel y el
// mensaje de WhatsApp lleva un link al detalle con fotos. Es la única ruta
// pública que escribe en la base, así que va con límites: tamaño del cuerpo,
// cantidad de ítems y pedidos por IP. Los precios los pone el servidor.

const MAX_BODY_BYTES = 20_000;

export async function POST(req: NextRequest) {
  // Tamaño declarado y acotado antes de leer nada
  const length = Number(req.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0 || length > MAX_BODY_BYTES)
    return NextResponse.json({ error: 'Pedido demasiado grande' }, { status: 413 });

  const ip = clientIp(req.headers);
  const wait = orderLimiter.retryAfter(ip);
  if (wait > 0)
    return NextResponse.json(
      { error: 'Demasiados pedidos seguidos. Probá de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );

  const body = await req.json().catch(() => null);
  const token =
    typeof body?.token === 'string' && ORDER_TOKEN_RE.test(body.token) ? body.token : null;
  const items = parseOrderItems(body?.items);
  if (!token || !items)
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });

  // Nombre y teléfono de quien pide: obligatorios. El teléfono tiene que ser un
  // número argentino con código de área, y se guarda siempre con sus 10 dígitos.
  const name = parseCustomerName(body?.customer?.name);
  const phone = parseCustomerPhone(body?.customer?.phone);
  if (!name || !phone)
    return NextResponse.json(
      { error: 'Faltan el nombre y un teléfono válido, con código de área' },
      { status: 400 }
    );

  orderLimiter.fail(ip);
  const result = await createOrder(token, items, { name, phone });
  if (result === 'empty')
    return NextResponse.json(
      { error: 'Ninguno de esos productos está disponible' },
      { status: 400 }
    );
  if (result === 'too-big')
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: result === 'created' ? 201 : 200 });
}
