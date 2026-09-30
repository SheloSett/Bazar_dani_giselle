import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  discountPercent,
  isOutOfStock,
  matchesSearch,
  maxQuantity,
  money,
  normalizeText,
  ogImagePath,
  stockLabel,
  thumbName,
  thumbUrl,
} from '@/lib/catalog';

describe('oferta', () => {
  test('porcentaje de descuento respecto del precio anterior', () => {
    assert.equal(discountPercent(800, 1000), 20);
    assert.equal(discountPercent(1, 3), 67);
    assert.equal(discountPercent(12500, 15000), 17);
  });

  test('sin oferta cuando no hay precio anterior o no es mayor', () => {
    assert.equal(discountPercent(1000, null), null);
    assert.equal(discountPercent(1000, 1000), null);
    assert.equal(discountPercent(1000, 900), null);
    assert.equal(discountPercent(1000, 0), null);
    assert.equal(discountPercent(999, 1000), null); // redondea a 0 %
  });
});

describe('stock', () => {
  test('etiquetas según las unidades', () => {
    assert.equal(stockLabel(null), null);
    assert.equal(stockLabel(0), 'Sin stock');
    assert.equal(stockLabel(1), 'Última unidad');
    assert.equal(stockLabel(3), 'Quedan 3');
    assert.equal(stockLabel(4), null);
  });

  test('tope de unidades para el pedido', () => {
    assert.equal(maxQuantity(null), Infinity);
    assert.equal(maxQuantity(0), 0);
    assert.equal(maxQuantity(5), 5);
    assert.equal(isOutOfStock(null), false);
    assert.equal(isOutOfStock(0), true);
    assert.equal(isOutOfStock(2), false);
  });
});

describe('búsqueda', () => {
  const p = { name: 'Cafetera eléctrica Ítalo', description: 'Para 6 pocillos', category: 'Cocina' };

  test('ignora tildes y mayúsculas', () => {
    assert.equal(normalizeText('Cafetera Ítalo ÑANDÚ'), 'cafetera italo nandu');
    assert.equal(matchesSearch(p, 'cafe'), true);
    assert.equal(matchesSearch(p, 'CAFÉ electrica'), true);
    assert.equal(matchesSearch(p, 'italo'), true);
  });

  test('busca también en descripción y categoría, y exige todas las palabras', () => {
    assert.equal(matchesSearch(p, 'pocillos'), true);
    assert.equal(matchesSearch(p, 'cocina'), true);
    assert.equal(matchesSearch(p, 'cafetera termo'), false);
    assert.equal(matchesSearch(p, 'termo'), false);
    assert.equal(matchesSearch(p, ''), true);
    assert.equal(matchesSearch(p, '   '), true);
  });
});

describe('formato y URLs', () => {
  test('precio en pesos argentinos', () => {
    assert.equal(money(12500), '$ 12.500');
    assert.equal(money(0), '$ 0');
    assert.equal(money(999), '$ 999');
    // 4 cifras con punto en cualquier motor (con toLocaleString Safari podía dar "6800")
    assert.equal(money(6800), '$ 6.800');
    assert.equal(money(1234567), '$ 1.234.567');
  });

  test('nombres de miniatura y de imagen para compartir', () => {
    assert.equal(thumbName('abc-123.jpg'), 'abc-123.t.webp');
    assert.equal(thumbName('abc-123.webp'), 'abc-123.t.webp');
    assert.equal(thumbUrl('abc.png'), '/uploads/abc.t.webp');
    assert.equal(ogImagePath('abc-123.webp'), '/og/abc-123.jpg');
  });
});
