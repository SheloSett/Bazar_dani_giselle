import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPromos,
  conditionText,
  countdownParts,
  formatPromoDate,
  hasManualOffer,
  isPromoLive,
  normalizeCode,
  productPromo,
  productPromoText,
  promoBadge,
  promoDiscount,
  promoInputDate,
  promoOffer,
  promoStatus,
  promoSummary,
  type PromoItem,
  type PromoRule,
} from '@/lib/promos';
import { parseArgDate, parseCouponCode, parsePromoInput } from '@/lib/validate';

const NOW = new Date('2026-10-07T15:00:00-03:00');

const promo = (over: Partial<PromoRule> = {}): PromoRule => ({
  id: 1,
  name: 'Semana del hogar',
  code: null,
  kind: 'percent',
  value: 10,
  scope: 'all',
  category_id: null,
  product_id: null,
  min_quantity: 1,
  min_total: 0,
  starts_at: null,
  ends_at: null,
  max_uses: null,
  uses: 0,
  active: true,
  ...over,
});

// mate (rubro 1) $1000 x2, vaso (rubro 2) $200 x3, bandeja (sin rubro) $500 x1 = 3100
const items: PromoItem[] = [
  { product_id: 10, category_id: 1, price: 1000, quantity: 2 },
  { product_id: 11, category_id: 2, price: 200, quantity: 3 },
  { product_id: 12, category_id: null, price: 500, quantity: 1 },
];

describe('descuento de una promoción', () => {
  test('porcentaje sobre todo el pedido', () => {
    assert.deepEqual(promoDiscount(promo(), items), { amount: 310, why: null });
  });

  test('porcentaje sobre un rubro o un producto', () => {
    assert.equal(promoDiscount(promo({ scope: 'category', category_id: 2, value: 50 }), items).amount, 300);
    assert.equal(promoDiscount(promo({ scope: 'product', product_id: 12, value: 20 }), items).amount, 100);
  });

  test('pesos: nunca más que el subtotal alcanzado', () => {
    assert.equal(promoDiscount(promo({ kind: 'amount', value: 250 }), items).amount, 250);
    assert.equal(promoDiscount(promo({ kind: 'amount', value: 9999, scope: 'product', product_id: 12 }), items).amount, 500);
  });

  test('redondea a pesos enteros', () => {
    assert.equal(promoDiscount(promo({ value: 15, scope: 'product', product_id: 11 }), items).amount, 90); // 600 * 15% = 90
    assert.equal(promoDiscount(promo({ value: 33, scope: 'product', product_id: 12 }), items).amount, 165);
  });

  test('condiciones: unidades mínimas y compra mínima, con el motivo', () => {
    assert.deepEqual(promoDiscount(promo({ min_quantity: 7 }), items), { amount: 0, why: 'aplica llevando 7 unidades o más' });
    assert.equal(promoDiscount(promo({ min_quantity: 6 }), items).amount, 310);
    assert.deepEqual(promoDiscount(promo({ min_total: 5000 }), items), { amount: 0, why: 'aplica con una compra mínima de $ 5.000' });
    assert.deepEqual(promoDiscount(promo({ scope: 'category', category_id: 9 }), items), { amount: 0, why: 'no hay productos de ese rubro en el pedido' });
    assert.deepEqual(promoDiscount(promo({ scope: 'product', product_id: 99 }), items), { amount: 0, why: 'ese producto no está en el pedido' });
  });

  test('el mínimo de unidades cuenta solo los productos alcanzados', () => {
    // el rubro 2 tiene 3 unidades: con mínimo 3 aplica, con 4 no
    assert.equal(promoDiscount(promo({ scope: 'category', category_id: 2, min_quantity: 3 }), items).amount, 60);
    assert.equal(promoDiscount(promo({ scope: 'category', category_id: 2, min_quantity: 4 }), items).amount, 0);
  });
});

describe('vigencia y estado', () => {
  test('activa, pausada, programada, vencida, agotada', () => {
    assert.equal(promoStatus(promo(), NOW), 'activa');
    assert.equal(promoStatus(promo({ active: false }), NOW), 'pausada');
    assert.equal(promoStatus(promo({ starts_at: '2026-10-08T00:00:00-03:00' }), NOW), 'programada');
    assert.equal(promoStatus(promo({ ends_at: '2026-10-06T23:59:59-03:00' }), NOW), 'vencida');
    assert.equal(promoStatus(promo({ code: 'X', max_uses: 2, uses: 2 }), NOW), 'agotada');
  });

  test('el día de fin cuenta completo', () => {
    const p = promo({ starts_at: new Date('2026-10-07T00:00:00-03:00'), ends_at: new Date('2026-10-07T23:59:59.999-03:00') });
    assert.equal(isPromoLive(p, NOW), true);
    assert.equal(isPromoLive(p, new Date('2026-10-08T00:00:01-03:00')), false);
  });
});

describe('cálculo del pedido', () => {
  test('sin promociones no cambia nada', () => {
    assert.deepEqual(applyPromos(items, [], { code: null, now: NOW }), { subtotal: 3100, discount: 0, total: 3100, lines: [], couponNote: null });
  });

  test('de varias automáticas aplica la que más descuenta', () => {
    const r = applyPromos(items, [promo({ id: 1, value: 10 }), promo({ id: 2, value: 50, scope: 'category', category_id: 2 }), promo({ id: 3, value: 5 })], { code: null, now: NOW });
    assert.deepEqual(r.lines, [{ promo_id: 1, name: 'Semana del hogar', code: null, amount: 310 }]);
    assert.equal(r.total, 2790);
  });

  test('las pausadas, vencidas y agotadas no cuentan', () => {
    const r = applyPromos(items, [promo({ active: false }), promo({ id: 2, ends_at: '2026-01-01' }), promo({ id: 3, max_uses: 1, uses: 1 })], { code: null, now: NOW });
    assert.equal(r.discount, 0);
  });

  test('el cupón se suma a la automática, y el código no distingue mayúsculas ni espacios', () => {
    const promos = [promo({ id: 1, value: 10 }), promo({ id: 2, code: 'HOGAR20', kind: 'amount', value: 200 })];
    const r = applyPromos(items, promos, { code: ' hogar 20 ', now: NOW });
    assert.deepEqual(r.lines.map((l) => [l.code, l.amount]), [[null, 310], ['HOGAR20', 200]]);
    assert.equal(r.discount, 510);
    assert.equal(r.total, 2590);
  });

  test('un cupón en porcentaje se calcula sobre los precios ya rebajados por la promoción', () => {
    // promo 10% sobre todo (310) → quedan 2790; cupón 10% sobre eso = 279
    const r = applyPromos(items, [promo({ id: 1, value: 10 }), promo({ id: 2, code: 'MAS10', value: 10 })], { code: 'MAS10', now: NOW });
    assert.deepEqual(r.lines.map((l) => l.amount), [310, 279]);
    assert.equal(r.total, 3100 - 589);
    // si la promoción alcanza solo un rubro, el cupón paga completo el resto
    const r2 = applyPromos(items, [promo({ id: 1, value: 50, scope: 'category', category_id: 2 }), promo({ id: 2, code: 'MAS10', value: 10 })], { code: 'MAS10', now: NOW });
    // rubro 2: 600 → 300 (desc. 300); cupón: 10% de (2000 + 300 + 500) = 280
    assert.deepEqual(r2.lines.map((l) => l.amount), [300, 280]);
  });

  test('un cupón no aplica sin su código, y uno desconocido se ignora', () => {
    const promos = [promo({ id: 2, code: 'HOGAR20', value: 20 })];
    assert.equal(applyPromos(items, promos, { code: null, now: NOW }).discount, 0);
    assert.equal(applyPromos(items, promos, { code: 'OTRO', now: NOW }).discount, 0);
  });

  test('el cupón que existe pero no cumple deja el motivo', () => {
    const r = applyPromos(items, [promo({ id: 2, code: 'GRANDE', value: 20, min_total: 10000 })], { code: 'GRANDE', now: NOW });
    assert.equal(r.discount, 0);
    assert.equal(r.couponNote, 'aplica con una compra mínima de $ 10.000');
  });

  test('el descuento nunca supera el subtotal', () => {
    const r = applyPromos(items, [promo({ id: 1, kind: 'amount', value: 3000 }), promo({ id: 2, code: 'TODO', kind: 'amount', value: 3000 })], { code: 'TODO', now: NOW });
    assert.equal(r.discount, 3100);
    assert.equal(r.total, 0);
  });
});

describe('textos y códigos', () => {
  test('normaliza el código', () => {
    assert.equal(normalizeCode('  ho gar 10 '), 'HOGAR10');
    assert.equal(parseCouponCode('hogar-10'), 'HOGAR-10');
    for (const v of ['ab', 'tiene espacios?', 'x'.repeat(21), 'ñandu', '', 12, null]) assert.equal(parseCouponCode(v), null, String(v));
  });

  test('resumen para el panel y el catálogo', () => {
    assert.equal(promoSummary(promo()), '10% de descuento');
    assert.equal(
      promoSummary(promo({ scope: 'category', category_id: 2, min_quantity: 3, ends_at: '2026-10-20T23:59:59-03:00' }), { category: 'Cocina' }),
      '15% de descuento en Cocina llevando 3 o más · hasta el 20/10'.replace('15%', '10%')
    );
    assert.equal(
      promoSummary(promo({ kind: 'amount', value: 2000, min_total: 15000, starts_at: '2026-10-01T00:00:00-03:00', ends_at: '2026-10-31T23:59:59-03:00' })),
      '$ 2.000 de descuento con compras desde $ 15.000 · del 1/10 al 31/10'
    );
  });

  test('fechas en hora argentina', () => {
    assert.equal(formatPromoDate('2026-10-20T02:30:00Z'), '19/10'); // 23:30 del 19 en Buenos Aires
    assert.equal(promoInputDate('2026-10-20T02:30:00Z'), '2026-10-19');
    assert.equal(promoInputDate(null), '');
  });
});

describe('formulario de promoción (parsePromoInput)', () => {
  const base = { name: 'Semana del hogar', kind: 'percent', value: '15', scope: 'all' };

  test('promoción automática mínima', () => {
    const r = parsePromoInput(base);
    assert.ok('value' in r);
    assert.deepEqual(r.value, {
      name: 'Semana del hogar', code: null, kind: 'percent', value: 15, scope: 'all', category_id: null, product_id: null,
      min_quantity: 1, min_total: 0, starts_at: null, ends_at: null, max_uses: null, active: true,
    });
  });

  test('cupón completo, con fechas del día entero en Argentina', () => {
    const r = parsePromoInput({ ...base, code: 'hogar 10', kind: 'amount', value: '2000', scope: 'category', category_id: '3', min_quantity: '2', min_total: '10000', starts_at: '2026-10-07', ends_at: '2026-10-20', max_uses: '50', active: false });
    assert.ok('value' in r);
    assert.equal(r.value.code, 'HOGAR10');
    assert.equal(r.value.category_id, 3);
    assert.equal(r.value.starts_at?.toISOString(), '2026-10-07T03:00:00.000Z');
    assert.equal(r.value.ends_at?.toISOString(), '2026-10-21T02:59:59.999Z');
    assert.equal(r.value.max_uses, 50);
    assert.equal(r.value.active, false);
  });

  test('rechaza lo que no cierra, con el motivo', () => {
    const bad = (body: object) => { const r = parsePromoInput(body); assert.ok('error' in r, JSON.stringify(body)); return r.error; };
    assert.match(bad({ ...base, name: ' ' }), /nombre/);
    assert.match(bad({ ...base, value: '150' }), /1 a 100/);
    assert.match(bad({ ...base, kind: 'amount', value: '0' }), /mayor a 0/);
    assert.match(bad({ ...base, scope: 'category' }), /rubro/);
    assert.match(bad({ ...base, scope: 'product', product_id: 'x' }), /producto/);
    assert.match(bad({ ...base, code: 'a' }), /código/);
    assert.match(bad({ ...base, min_quantity: '0' }), /unidades/);
    assert.match(bad({ ...base, starts_at: '2026-10-20', ends_at: '2026-10-07' }), /fin/);
    assert.match(bad({ ...base, starts_at: '20/10/2026' }), /fechas/);
    assert.match(bad({ ...base, max_uses: '10' }), /cupones/);
    assert.match(bad({ ...base, code: 'HOGAR', max_uses: '0' }), /usos/);
  });

  test('parseArgDate', () => {
    assert.deepEqual(parseArgDate('', false), { value: null });
    assert.equal(parseArgDate('2026-10-07', false)?.value?.toISOString(), '2026-10-07T03:00:00.000Z');
    assert.equal(parseArgDate('2026-10-07', true)?.value?.toISOString(), '2026-10-08T02:59:59.999Z');
    assert.equal(parseArgDate('ayer', false), null);
  });
});

describe('ofertas propias y campañas en cada producto', () => {

  test('un producto con precio anterior queda afuera de promociones y cupones', () => {
    const withSale: PromoItem[] = [
      { product_id: 10, category_id: 1, price: 1000, quantity: 2, on_sale: true },
      { product_id: 11, category_id: 1, price: 500, quantity: 1 },
    ];
    assert.equal(promoDiscount(promo({ value: 10 }), withSale).amount, 50);
    assert.deepEqual(promoDiscount(promo({ value: 10, scope: 'product', product_id: 10 }), withSale), { amount: 0, why: 'no se suma a productos que ya están en oferta' });
    assert.equal(hasManualOffer({ price: 800, compare_price: 1000 }), true);
    assert.equal(hasManualOffer({ price: 1000, compare_price: 1000 }), false);
    assert.equal(hasManualOffer({ price: 1000, compare_price: null }), false);
  });

  test('la campaña del producto: la que más descuenta, con precio nuevo si aplica tal cual', () => {
    const p = { id: 10, category_id: 1, price: 10000, compare_price: null };
    const promos = [promo({ id: 1, value: 10 }), promo({ id: 2, value: 20, scope: 'category', category_id: 1 }), promo({ id: 3, value: 50, code: 'X' })];
    const pp = productPromo(p, promos, NOW);
    assert.equal(pp?.promo.id, 2);
    assert.equal(pp?.price, 8000);
    assert.equal(pp?.percent, 20);
    assert.equal(pp?.condition, null);
    assert.equal(productPromoText(pp!), 'Semana del hogar: 20% de descuento');
  });

  test('con mínimos, la línea dice el precio por unidad y la condición', () => {
    const p = { id: 10, category_id: 1, price: 10000, compare_price: null };
    const pp = productPromo(p, [promo({ id: 2, name: 'Éxitos', value: 20, min_quantity: 2 })], NOW);
    assert.equal(pp?.condition, 'llevando 2 o más');
    assert.equal(productPromoText(pp!), 'Éxitos: $ 8.000 c/u llevando 2 o más');
    const amount = productPromo(p, [promo({ id: 3, name: 'Fijo', kind: 'amount', value: 1500, min_total: 20000 })], NOW);
    assert.equal(amount?.price, null);
    assert.equal(productPromoText(amount!), 'Fijo: $ 1.500 de descuento con compras desde $ 20.000');
  });

  test('sin campaña, con oferta propia o con cupón solamente, no hay precio nuevo', () => {
    assert.equal(productPromo({ id: 10, category_id: 1, price: 10000, compare_price: null }, [], NOW), null);
    assert.equal(productPromo({ id: 10, category_id: 1, price: 8000, compare_price: 10000 }, [promo()], NOW), null);
    assert.equal(productPromo({ id: 10, category_id: 1, price: 10000, compare_price: null }, [promo({ code: 'X' })], NOW), null);
    assert.equal(productPromo({ id: 10, category_id: 2, price: 10000, compare_price: null }, [promo({ scope: 'category', category_id: 1 })], NOW), null);
  });

  test('textos de la tarjeta de campaña', () => {
    assert.deepEqual(promoBadge(promo({ value: 20 })), { amount: '20%', suffix: 'OFF' });
    assert.deepEqual(promoBadge(promo({ kind: 'amount', value: 1500 })), { amount: '$ 1.500', suffix: 'OFF' });
    assert.equal(promoOffer(promo({ value: 15, scope: 'category', category_id: 2, min_quantity: 3, ends_at: '2026-10-20' }), { category: 'Cocina' }), '15% de descuento en Cocina llevando 3 o más');
    assert.equal(conditionText(promo({ min_quantity: 2, min_total: 5000 })), 'llevando 2 o más y con compras desde $ 5.000');
  });

  test('cuenta regresiva', () => {
    assert.deepEqual(countdownParts('2026-10-10T15:00:30-03:00', NOW), { days: 3, hours: 0, minutes: 0, seconds: 30, urgent: false });
    assert.deepEqual(countdownParts('2026-10-08T16:01:05-03:00', NOW), { days: 1, hours: 1, minutes: 1, seconds: 5, urgent: true });
    assert.equal(countdownParts('2026-10-07T14:59:59-03:00', NOW), null);
    assert.equal(countdownParts(null, NOW), null);
  });
});
