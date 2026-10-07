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

const inScope = (p: PromoRule, it: PromoItem): boolean =>
  p.scope === 'all' ||
  (p.scope === 'category' && it.category_id !== null && it.category_id === p.category_id) ||
  (p.scope === 'product' && it.product_id === p.product_id);

const pesos = (n: number) => `$ ${n.toLocaleString('es-AR')}`;

// Cuánto descuenta esta promoción en estos productos, y si no descuenta, por qué
export function promoDiscount(
  p: PromoRule,
  items: PromoItem[]
): { amount: number; why: string | null } {
  const orderTotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const mine = items.filter((it) => inScope(p, it));
  const qty = mine.reduce((s, it) => s + it.quantity, 0);
  const sub = mine.reduce((s, it) => s + it.price * it.quantity, 0);
  if (!mine.length)
    return {
      amount: 0,
      why:
        p.scope === 'product'
          ? 'ese producto no está en el pedido'
          : 'no hay productos de ese rubro en el pedido',
    };
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

// "15% de descuento en Cocina llevando 3 o más · hasta el 20/10"
export function promoSummary(
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
  const conds: string[] = [];
  if (p.min_quantity > 1) conds.push(`llevando ${p.min_quantity} o más`);
  if (p.min_total > 0) conds.push(`con compras desde ${pesos(p.min_total)}`);
  const from = formatPromoDate(p.starts_at);
  const to = formatPromoDate(p.ends_at);
  const when = from && to ? `del ${from} al ${to}` : to ? `hasta el ${to}` : from ? `desde el ${from}` : '';
  return [off + where, ...conds].join(' ') + (when ? ` · ${when}` : '');
}
