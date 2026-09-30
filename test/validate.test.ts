import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseId, parseOptionalPrice, parsePrice, parseStock } from '@/lib/validate';

describe('parseId', () => {
  test('acepta enteros positivos como texto o número', () => {
    assert.equal(parseId('42'), 42);
    assert.equal(parseId(7), 7);
    assert.equal(parseId('2147483647'), 2147483647);
  });

  test('rechaza lo que Postgres no aceptaría como INT', () => {
    for (const v of ['abc', '', '0', '-1', '1.5', 1.5, '1e3', '2147483648', ' 1', null, undefined, {}]) {
      assert.equal(parseId(v), null, String(v));
    }
  });
});

describe('parsePrice', () => {
  test('redondea a pesos enteros', () => {
    assert.equal(parsePrice(1500), 1500);
    assert.equal(parsePrice('1500'), 1500);
    assert.equal(parsePrice(99.6), 100);
    assert.equal(parsePrice(0), 0);
  });

  test('rechaza negativos, vacíos y valores fuera de rango', () => {
    for (const v of [-1, '', '  ', 'abc', NaN, Infinity, 3e9, null, undefined, true]) {
      assert.equal(parsePrice(v), null, String(v));
    }
  });
});

describe('parseOptionalPrice (precio anterior)', () => {
  test('vacío o cero = sin valor', () => {
    for (const v of [null, undefined, '', '  ', 0, '0']) {
      assert.deepEqual(parseOptionalPrice(v), { value: null }, String(v));
    }
  });

  test('un precio válido se conserva; uno inválido se rechaza', () => {
    assert.deepEqual(parseOptionalPrice('1500'), { value: 1500 });
    assert.deepEqual(parseOptionalPrice(1499.6), { value: 1500 });
    for (const v of ['abc', -5, 3e9, true, {}]) {
      assert.equal(parseOptionalPrice(v), null, String(v));
    }
  });
});

describe('parseStock', () => {
  test('vacío = sin control de stock', () => {
    for (const v of [null, undefined, '', '  ']) {
      assert.deepEqual(parseStock(v), { value: null }, String(v));
    }
  });

  test('enteros desde cero; nada más', () => {
    assert.deepEqual(parseStock('0'), { value: 0 });
    assert.deepEqual(parseStock(5), { value: 5 });
    assert.deepEqual(parseStock(' 12 '), { value: 12 });
    for (const v of ['-1', '1.5', 1.5, 'abc', '3000000000', true, {}]) {
      assert.equal(parseStock(v), null, String(v));
    }
  });
});
