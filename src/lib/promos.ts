// Promociones y cupones: las reglas que no tocan la base. Las usa el servidor al
// guardar un pedido (con los precios reales) y el catálogo para mostrar el
// descuento mientras la persona arma el pedido.
//
// - Promoción automática: sin código; aplica sola si se cumplen sus condiciones.
//   Si hay varias, se aplica la que más descuenta (no se suman entre sí).
// - Cupón: igual, pero solo si la persona escribe su código. Se suma a la
//   promoción automática y se calcula sobre lo que queda después de ella (un 10%
//   de cupón sobre productos ya rebajados un 20% descuenta el 10% del precio rebajado).
// - El descuento sale del subtotal de los productos alcanzados (todo el pedido, un
//   rubro o un producto), en porcentaje o en pesos, y nunca supera ese subtotal.
// - Un producto con precio anterior cargado (oferta propia) queda afuera de
//   promociones y cupones: nunca se suman dos descuentos sobre lo mismo.

export type PromoKind = 'percent' | 'amount';
export type PromoScope = 'all' | 'category' | 'product';

export interface PromoRule {
  id: number;
  name: string;
  // null = promoción automática; con código = cupón (guardado en mayúsculas)
  code: string | null;
  kind: PromoKind;
  // porcentaje (1 a 100) o pesos
  value: number;
  scope: PromoScope;
  category_id: number | null;
  product_id: number | null;
  // unidades mínimas de los productos alcanzados y compra mínima (de todo el pedido)
  min_quantity: number;
  min_total: number;
  // vigencia; null = sin límite. Llegan como Date del servidor o como texto del JSON.
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  // cupones: tope de usos; null = sin tope
  max_uses: number | null;
  uses: number;
  active: boolean;
}

// Lo que el catálogo recibe de las promociones automáticas (nunca lleva códigos)
export type PublicPromo = PromoRule;

export interface PromoItem {
  product_id: number;
  category_id: number | null;
  price: number;
  quantity: number;
  // tiene precio anterior cargado (oferta propia): no entra en promociones
  on_sale?: boolean;
}

// Un descuento aplicado a un pedido, tal como queda guardado
export interface DiscountLine {
  promo_id: number;
  name: string;
  code: string | null;
  amount: number;
}

export interface Pricing {
  subtotal: number;
  discount: number;
  total: number;
  lines: DiscountLine[];
  // El cupón existe pero hoy no descuenta nada: por qué (para mostrarlo)
  couponNote: string | null;
}

// Lo que llega del formulario del panel, ya validado (parsePromoInput)
export interface PromoInput {
  name: string;
  code: string | null;
  kind: PromoKind;
  value: number;
  scope: PromoScope;
  category_id: number | null;
  product_id: number | null;
  min_quantity: number;
  min_total: number;
  starts_at: Date | null;
  ends_at: Date | null;
  max_uses: number | null;
  active: boolean;
}

export const PROMO_CODE_RE = /^[A-Z0-9-]{3,20}$/;
export const PROMO_NAME_MAX = 60;

// "hogar 10" → "HOGAR10": así se guarda y así se compara
export function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

const date = (d: Date | string | null): Date | null => {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
};

// Dónde está la vigencia respecto de ahora
export function promoWindow(p: PromoRule, now: Date): 'soon' | 'live' | 'over' {
  const from = date(p.starts_at);
  const to = date(p.ends_at);
  if (from && from.getTime() > now.getTime()) return 'soon';
  if (to && to.getTime() < now.getTime()) return 'over';
  return 'live';
}

export function isUsedUp(p: PromoRule): boolean {
  return p.max_uses !== null && p.uses >= p.max_uses;
}

// ¿Puede aplicar hoy? (activa, en fecha y con usos disponibles)
export function isPromoLive(p: PromoRule, now: Date): boolean {
  return p.active && promoWindow(p, now) === 'live' && !isUsedUp(p);
}

// Estado para el panel
export type PromoStatus = 'activa' | 'pausada' | 'programada' | 'vencida' | 'agotada';
export function promoStatus(p: PromoRule, now: Date): PromoStatus {
  if (!p.active) return 'pausada';
  if (isUsedUp(p)) return 'agotada';
  const w = promoWindow(p, now);
  return w === 'soon' ? 'programada' : w === 'over' ? 'vencida' : 'activa';
}

// ¿La promoción alcanza a este producto por su alcance? (sin mirar la oferta propia)
const reaches = (p: PromoRule, it: PromoItem): boolean =>
  p.scope === 'all' ||
  (p.scope === 'category' && it.category_id !== null && it.category_id === p.category_id) ||
  (p.scope === 'product' && it.product_id === p.product_id);

const inScope = (p: PromoRule, it: PromoItem): boolean => !it.on_sale && reaches(p, it);

// Un producto con precio anterior cargado tiene una oferta propia
export function hasManualOffer(p: { price: number; compare_price: number | null }): boolean {
  return p.compare_price !== null && p.compare_price > p.price;
}

const pesos = (n: number) => `$ ${n.toLocaleString('es-AR')}`;

// Cuánto descuenta esta promoción en estos productos, y si no descuenta, por qué
export function promoDiscount(
  p: PromoRule,
  items: PromoItem[]
): { amount: number; why: string | null } {
  const orderTotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const reached = items.filter((it) => reaches(p, it));
  const mine = reached.filter((it) => !it.on_sale);
  const qty = mine.reduce((s, it) => s + it.quantity, 0);
  const sub = mine.reduce((s, it) => s + it.price * it.quantity, 0);
  if (!reached.length)
    return {
      amount: 0,
      why:
        p.scope === 'product'
          ? 'ese producto no está en el pedido'
          : 'no hay productos de ese rubro en el pedido',
    };
  if (!mine.length) return { amount: 0, why: 'no se suma a productos que ya están en oferta' };
  if (qty < p.min_quantity)
    return { amount: 0, why: `aplica llevando ${p.min_quantity} unidades o más` };
  if (orderTotal < p.min_total)
    return { amount: 0, why: `aplica con una compra mínima de ${pesos(p.min_total)}` };
  const amount = p.kind === 'percent' ? Math.round((sub * p.value) / 100) : Math.min(p.value, sub);
  return { amount: Math.max(0, Math.min(amount, sub)), why: amount > 0 ? null : 'no descuenta nada' };
}

// Los mismos productos con el precio rebajado por la promoción automática, repartida
// en proporción entre los productos que alcanza
function afterPromo(items: PromoItem[], best: { p: PromoRule; amount: number } | null): PromoItem[] {
  if (!best) return items;
  const mine = items.filter((it) => inScope(best.p, it));
  const sub = mine.reduce((s, it) => s + it.price * it.quantity, 0);
  if (!sub) return items;
  const factor = 1 - best.amount / sub;
  return items.map((it) => (inScope(best.p, it) ? { ...it, price: it.price * factor } : it));
}

// El cálculo completo: la promoción automática que más descuenta, más el cupón si
// se escribió uno (code) y existe en la lista
export function applyPromos(
  items: PromoItem[],
  promos: PromoRule[],
  opts: { code: string | null; now: Date }
): Pricing {
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const lines: DiscountLine[] = [];
  let couponNote: string | null = null;

  let best: { p: PromoRule; amount: number } | null = null;
  for (const p of promos) {
    if (p.code !== null || !isPromoLive(p, opts.now)) continue;
    const { amount } = promoDiscount(p, items);
    if (amount > 0 && (!best || amount > best.amount)) best = { p, amount };
  }
  if (best) lines.push({ promo_id: best.p.id, name: best.p.name, code: null, amount: best.amount });

  const code = opts.code ? normalizeCode(opts.code) : '';
  if (code) {
    const c = promos.find((p) => p.code === code);
    if (c && isPromoLive(c, opts.now)) {
      // Las condiciones (mínimos) se miran sobre el pedido tal cual; el importe, sobre
      // los precios ya rebajados por la promoción automática
      const { amount: raw, why } = promoDiscount(c, items);
      const amount = raw > 0 ? promoDiscount(c, afterPromo(items, best)).amount : 0;
      if (amount > 0) lines.push({ promo_id: c.id, name: c.name, code: c.code, amount });
      else couponNote = why ?? 'no descuenta nada';
    }
  }

  const discount = Math.min(
    subtotal,
    lines.reduce((s, l) => s + l.amount, 0)
  );
  return { subtotal, discount, total: subtotal - discount, lines, couponNote };
}

// Fecha para un <input type="date"> (AAAA-MM-DD), en hora argentina
const argInput = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
});
export function promoInputDate(d: Date | string | null): string {
  const x = date(d);
  return x ? argInput.format(x) : '';
}

// ---------- textos ----------

const argDate = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
});

export function formatPromoDate(d: Date | string | null): string {
  const x = date(d);
  return x ? argDate.format(x) : '';
}

// "llevando 3 o más", "con compras desde $ 5.000", o null si aplica tal cual
export function conditionText(p: PromoRule): string | null {
  const conds: string[] = [];
  if (p.min_quantity > 1) conds.push(`llevando ${p.min_quantity} o más`);
  if (p.min_total > 0) conds.push(`con compras desde ${pesos(p.min_total)}`);
  return conds.length ? conds.join(' y ') : null;
}

// "15% de descuento en Cocina llevando 3 o más" (sin las fechas)
export function promoOffer(
  p: PromoRule,
  names: { category?: string | null; product?: string | null } = {}
): string {
  const off = p.kind === 'percent' ? `${p.value}% de descuento` : `${pesos(p.value)} de descuento`;
  const where =
    p.scope === 'category'
      ? ` en ${names.category ?? 'un rubro'}`
      : p.scope === 'product'
        ? ` en ${names.product ?? 'un producto'}`
        : '';
  const cond = conditionText(p);
  return off + where + (cond ? ` ${cond}` : '');
}

// Lo mismo con la vigencia: "… · hasta el 20/10"
export function promoSummary(
  p: PromoRule,
  names: { category?: string | null; product?: string | null } = {}
): string {
  const from = formatPromoDate(p.starts_at);
  const to = formatPromoDate(p.ends_at);
  const when = from && to ? `del ${from} al ${to}` : to ? `hasta el ${to}` : from ? `desde el ${from}` : '';
  return promoOffer(p, names) + (when ? ` · ${when}` : '');
}

// ---------- la campaña en cada producto ----------

export interface ProductPromo {
  promo: PromoRule;
  // precio por unidad con la campaña y el porcentaje (solo cuando es en porcentaje)
  price: number | null;
  percent: number | null;
  // lo que hay que cumplir, o null si aplica tal cual
  condition: string | null;
}

// La campaña que le toca a un producto del catálogo (si hay varias, la que más
// descuenta), para mostrar el precio nuevo en la tarjeta y en la ficha. null si no
// hay ninguna o si el producto tiene oferta propia.
export function productPromo(
  p: { id: number; category_id: number | null; price: number; compare_price: number | null },
  promos: PromoRule[],
  now: Date
): ProductPromo | null {
  if (hasManualOffer(p) || p.price <= 0) return null;
  const item: PromoItem = { product_id: p.id, category_id: p.category_id, price: p.price, quantity: 1 };
  let best: { promo: PromoRule; pct: number } | null = null;
  for (const promo of promos) {
    if (promo.code !== null || !isPromoLive(promo, now) || !reaches(promo, item)) continue;
    const pct = promo.kind === 'percent' ? promo.value : Math.min(100, (promo.value / p.price) * 100);
    if (!best || pct > best.pct) best = { promo, pct };
  }
  if (!best) return null;
  const { promo } = best;
  return {
    promo,
    percent: promo.kind === 'percent' ? promo.value : null,
    price: promo.kind === 'percent' ? Math.round(p.price * (1 - promo.value / 100)) : null,
    condition: conditionText(promo),
  };
}

// La línea que acompaña al precio: "Éxitos: $ 8.000 c/u llevando 2 o más"
export function productPromoText(pp: ProductPromo): string {
  const { promo } = pp;
  if (pp.price !== null && pp.condition) return `${promo.name}: ${pesos(pp.price)} c/u ${pp.condition}`;
  if (pp.price !== null) return `${promo.name}: ${promo.value}% de descuento`;
  return `${promo.name}: ${pesos(promo.value)} de descuento${pp.condition ? ` ${pp.condition}` : ''}`;
}

// Lo que anuncia la tarjeta de campaña en grande: "20%" / "$ 1.500" + "OFF"
export function promoBadge(p: PromoRule): { amount: string; suffix: string } {
  return { amount: p.kind === 'percent' ? `${p.value}%` : pesos(p.value), suffix: 'OFF' };
}

// Cuánto falta para que termine; null si no tiene fecha o ya terminó. Con menos de
// tres días es "urgente" (la tarjeta lo resalta).
export function countdownParts(
  endsAt: Date | string | null,
  now: Date
): { days: number; hours: number; minutes: number; seconds: number; urgent: boolean } | null {
  const end = date(endsAt);
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    urgent: ms < 3 * 86400000,
  };
}
