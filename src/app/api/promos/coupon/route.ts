import { NextRequest, NextResponse } from 'next/server';
import { findCoupon } from '@/lib/promos-data';
import { isUsedUp, promoWindow, type PromoRule } from '@/lib/promos';
import { bodyWithin, clientIp, couponLimiter } from '@/lib/rate-limit';
import { parseCouponCode } from '@/lib/validate';

// El catálogo pregunta si un cupón existe y puede usarse: { code }. Devuelve la
// promoción (con sus condiciones) para que el navegador calcule el descuento
// mientras la persona sigue armando el pedido; el descuento real se vuelve a
// calcular en el servidor al guardar. Con límite de intentos: los códigos no se
// adivinan probando.

const MAX_BODY_BYTES = 2_000;

export async function POST(req: NextRequest) {
  if (!bodyWithin(req.headers, MAX_BODY_BYTES))
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 413 });

  const ip = clientIp(req.headers);
  const wait = couponLimiter.retryAfter(ip);
  if (wait > 0)
    return NextResponse.json(
      { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );

  const body = await req.json().catch(() => null);
  const code = parseCouponCode(body?.code);
  if (!code) {
    couponLimiter.fail(ip);
    return NextResponse.json({ error: 'Ese cupón no existe.' }, { status: 404 });
  }

  const promo = await findCoupon(code);
  if (!promo || !promo.active) {
    couponLimiter.fail(ip);
    return NextResponse.json({ error: 'Ese cupón no existe.' }, { status: 404 });
  }
  const window = promoWindow(promo, new Date());
  if (window === 'soon')
    return NextResponse.json({ error: 'Ese cupón todavía no empezó.' }, { status: 409 });
  if (window === 'over')
    return NextResponse.json({ error: 'Ese cupón ya venció.' }, { status: 409 });
  if (isUsedUp(promo))
    return NextResponse.json({ error: 'Ese cupón ya se agotó.' }, { status: 409 });

  couponLimiter.succeed(ip);
  // Solo lo que hace falta para calcular el descuento en el navegador
  const rule: PromoRule = {
    id: promo.id, name: promo.name, code: promo.code, kind: promo.kind, value: promo.value,
    scope: promo.scope, category_id: promo.category_id, product_id: promo.product_id,
    min_quantity: promo.min_quantity, min_total: promo.min_total,
    starts_at: promo.starts_at, ends_at: promo.ends_at,
    max_uses: promo.max_uses, uses: promo.uses, active: promo.active,
  };
  return NextResponse.json({
    promo: rule,
    names: { category: promo.category_name, product: promo.product_name },
  });
}
