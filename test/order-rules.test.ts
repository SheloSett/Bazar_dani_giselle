import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pendingReminder,
  planStock,
  shortStockQuestion,
  unitsLeft,
  waitingLabel,
} from '@/lib/order-rules';

const line = (itemId: number, productId: number, quantity: number, stock: number) => ({
  itemId,
  productId,
  name: `Producto ${productId}`,
  quantity,
  stock,
});

describe('stock al confirmar un pedido', () => {
  test('si alcanza, descuenta lo pedido', () => {
    const plan = planStock([line(1, 10, 2, 5), line(2, 11, 1, 1)]);
    assert.deepEqual(plan.takes, [
      { itemId: 1, take: 2 },
      { itemId: 2, take: 1 },
    ]);
    assert.deepEqual(plan.stock, [
      { productId: 10, stock: 3 },
      { productId: 11, stock: 0 },
    ]);
    assert.deepEqual(plan.short, []);
  });

  test('si no alcanza, descuenta lo que hay y avisa de cuál', () => {
    const plan = planStock([line(1, 10, 5, 2), line(2, 11, 1, 4)]);
    assert.deepEqual(plan.takes, [
      { itemId: 1, take: 2 },
      { itemId: 2, take: 1 },
    ]);
    assert.deepEqual(plan.stock, [
      { productId: 10, stock: 0 },
      { productId: 11, stock: 3 },
    ]);
    assert.deepEqual(plan.short, [{ name: 'Producto 10', wanted: 5, available: 2 }]);
  });

  test('sin stock no descuenta nada', () => {
    const plan = planStock([line(1, 10, 3, 0)]);
    assert.deepEqual(plan.takes, [{ itemId: 1, take: 0 }]);
    assert.deepEqual(plan.stock, [{ productId: 10, stock: 0 }]);
    assert.deepEqual(plan.short, [{ name: 'Producto 10', wanted: 3, available: 0 }]);
  });

  test('el mismo producto en dos renglones comparte el stock', () => {
    const plan = planStock([line(1, 10, 2, 3), line(2, 10, 2, 3)]);
    assert.deepEqual(plan.takes, [
      { itemId: 1, take: 2 },
      { itemId: 2, take: 1 },
    ]);
    assert.deepEqual(plan.stock, [{ productId: 10, stock: 0 }]);
    assert.deepEqual(plan.short, [{ name: 'Producto 10', wanted: 2, available: 1 }]);
  });

  test('un stock negativo cargado a mano cuenta como cero', () => {
    const plan = planStock([line(1, 10, 1, -4)]);
    assert.deepEqual(plan.takes, [{ itemId: 1, take: 0 }]);
    assert.deepEqual(plan.stock, [{ productId: 10, stock: 0 }]);
  });

  test('un pedido sin productos con stock no cambia nada', () => {
    assert.deepEqual(planStock([]), { takes: [], stock: [], short: [] });
  });
});

describe('avisos del panel de pedidos', () => {
  test('unidades que quedan', () => {
    assert.equal(unitsLeft(0), 'no queda ninguna');
    assert.equal(unitsLeft(1), 'queda 1');
    assert.equal(unitsLeft(7), 'quedan 7');
  });

  test('pregunta cuando no alcanza el stock de un producto', () => {
    const q = shortStockQuestion(12, [{ name: 'Jarra', wanted: 2, available: 1 }]);
    assert.ok(q.includes('pedido #12'));
    assert.ok(q.includes('• Jarra: pide 2, queda 1'));
    assert.ok(q.includes('ese producto queda en 0'));
  });

  test('pregunta cuando no alcanza el stock de varios', () => {
    const q = shortStockQuestion(3, [
      { name: 'Jarra', wanted: 2, available: 0 },
      { name: 'Vaso', wanted: 6, available: 4 },
    ]);
    assert.ok(q.includes('• Jarra: pide 2, no queda ninguna'));
    assert.ok(q.includes('• Vaso: pide 6, quedan 4'));
    assert.ok(q.includes('esos productos queda en 0'));
  });

  test('cuánto hace que espera un pedido', () => {
    assert.equal(waitingLabel(0), null);
    assert.equal(waitingLabel(1), 'hace 1 día');
    assert.equal(waitingLabel(4), 'hace 4 días');
  });

  test('sin pedidos viejos no hay recordatorio', () => {
    assert.equal(pendingReminder(0, 0), null);
  });

  test('recordatorio de un pedido', () => {
    const r = pendingReminder(1, 3);
    assert.equal(r?.title, 'Hay 1 pedido pendiente desde hace 3 días.');
    assert.ok(r?.advice.includes('marcalo como Confirmado'));
  });

  test('recordatorio de varios pedidos, con el más viejo', () => {
    const r = pendingReminder(3, 5);
    assert.equal(
      r?.title,
      'Hay 3 pedidos pendientes desde hace más de un día (el más viejo, desde hace 5 días).'
    );
    assert.ok(r?.advice.includes('marcalos como Confirmado'));
  });

  test('si todos son de ayer no aclara cuál es el más viejo', () => {
    assert.equal(pendingReminder(2, 1)?.title, 'Hay 2 pedidos pendientes desde hace más de un día.');
  });
});
