import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_TOKEN_RE,
  parseCategoryName,
  parseCustomerName,
  parseId,
  parseIdList,
  parseOptionalPrice,
  parseOrderItems,
  parsePhone,
  parsePrice,
  parseStock,
  sameIdSet,
} from '@/lib/validate';

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

describe('parseCategoryName', () => {
  test('recorta y junta espacios de más', () => {
    assert.equal(parseCategoryName('  Mates   y termos '), 'Mates y termos');
    assert.equal(parseCategoryName('x'.repeat(60)), 'x'.repeat(60));
  });

  test('rechaza vacíos, muy largos o que no son texto', () => {
    for (const v of ['', '   ', 'x'.repeat(61), null, undefined, 12, {}]) {
      assert.equal(parseCategoryName(v), null, String(v));
    }
  });
});

describe('pedidos (ruta pública)', () => {
  test('acepta ítems válidos y suma los productos repetidos', () => {
    assert.deepEqual(parseOrderItems([{ id: 3, quantity: 2 }]), [{ id: 3, quantity: 2 }]);
    assert.deepEqual(
      parseOrderItems([{ id: 3, quantity: 2 }, { id: 5, quantity: 1 }, { id: 3, quantity: 4 }]),
      [{ id: 3, quantity: 6 }, { id: 5, quantity: 1 }]
    );
  });

  test('ignora lo que venga de más (el precio no se toma del navegador)', () => {
    assert.deepEqual(parseOrderItems([{ id: 3, quantity: 1, price: 1, name: 'x' }]), [
      { id: 3, quantity: 1 },
    ]);
  });

  test('rechaza listas vacías, enormes o con datos raros', () => {
    const many = Array.from({ length: 101 }, (_, i) => ({ id: i + 1, quantity: 1 }));
    const bad = [
      [], many, null, undefined, 'x', {}, [null], [{}], [{ id: 0, quantity: 1 }],
      [{ id: 3, quantity: 0 }], [{ id: 3, quantity: -1 }], [{ id: 3, quantity: 1.5 }],
      [{ id: 3, quantity: '2' }], [{ id: 'abc', quantity: 1 }], [{ id: 3, quantity: 10000 }],
      [{ id: 3, quantity: 9999 }, { id: 3, quantity: 1 }],
    ];
    for (const v of bad) assert.equal(parseOrderItems(v), null, JSON.stringify(v)?.slice(0, 60));
  });

  test('formato del código del link', () => {
    assert.equal(ORDER_TOKEN_RE.test('aZ09_-aZ09_-aZ09'), true);
    for (const t of ['corto', 'con espacio 1234567', '../../etc/passwd..', 'a'.repeat(41), ''])
      assert.equal(ORDER_TOKEN_RE.test(t), false, t);
  });
});

describe('datos de quien pide', () => {
  test('nombre: recorta espacios y exige de 2 a 80 caracteres', () => {
    assert.equal(parseCustomerName('  Giselle   Bodek '), 'Giselle Bodek');
    assert.equal(parseCustomerName('Lu'), 'Lu');
    for (const v of ['', ' ', 'a', 'x'.repeat(81), null, undefined, 12, {}])
      assert.equal(parseCustomerName(v), null, String(v));
  });

  test('teléfono: acepta el formato que escriba la persona y guarda solo dígitos', () => {
    assert.equal(parsePhone('11 4066-2350'), '1140662350');
    assert.equal(parsePhone('+54 9 (11) 4066-2350'), '5491140662350');
    assert.equal(parsePhone('011.4066.2350'), '01140662350');
    assert.equal(parsePhone('40662350'), '40662350');
  });

  test('teléfono: rechaza lo que no es un teléfono', () => {
    for (const v of ['', '1234567', 'no tengo', '11 4066 2350 int 3', '1'.repeat(16), ' '.repeat(50), 1140662350, null, undefined])
      assert.equal(parsePhone(v), null, String(v));
  });
});

describe('reordenamiento (orden manual)', () => {
  test('parseIdList: lista de ids válidos, tal como llegó', () => {
    assert.deepEqual(parseIdList([3, 1, 2]), [3, 1, 2]);
    assert.deepEqual(parseIdList(['5', 7]), [5, 7]);
  });

  test('parseIdList: rechaza vacíos, enormes o con ids inválidos', () => {
    for (const v of [[], [0], [1, 'abc'], [1, null], [1.5], 'nope', null, undefined, {}])
      assert.equal(parseIdList(v), null, JSON.stringify(v));
    assert.equal(parseIdList(Array.from({ length: 1001 }, (_, i) => i + 1)), null);
  });

  test('sameIdSet: mismos ids en cualquier orden, sin agregar ni sacar', () => {
    assert.equal(sameIdSet([1, 2, 3], [3, 1, 2]), true);
    assert.equal(sameIdSet([], []), true);
    assert.equal(sameIdSet([1, 2], [1, 2, 3]), false); // agrega
    assert.equal(sameIdSet([1, 2, 3], [1, 2]), false); // saca
    assert.equal(sameIdSet([1, 2], [1, 1]), false); // repite
    assert.equal(sameIdSet([1, 2], [1, 3]), false); // cambia
  });
});
