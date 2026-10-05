import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { bodyWithin, clientIp, createLoginLimiter } from '@/lib/rate-limit';

function setup() {
  let t = 1_000_000;
  const limiter = createLoginLimiter(
    { windowMs: 60_000, maxPerIp: 3, maxGlobal: 5 },
    () => t
  );
  return { limiter, advance: (ms: number) => (t += ms) };
}

describe('límite de intentos de login', () => {
  test('bloquea una IP después de varios fallos, sin afectar a otras', () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) {
      assert.equal(limiter.retryAfter('1.1.1.1'), 0);
      limiter.fail('1.1.1.1');
    }
    assert.equal(limiter.retryAfter('1.1.1.1'), 60);
    assert.equal(limiter.retryAfter('2.2.2.2'), 0);
  });

  test('se libera al pasar la ventana', () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) limiter.fail('1.1.1.1');
    advance(30_000);
    assert.equal(limiter.retryAfter('1.1.1.1'), 30);
    advance(30_000);
    assert.equal(limiter.retryAfter('1.1.1.1'), 0);
  });

  test('el tope global frena aunque se roten IPs', () => {
    const { limiter } = setup();
    for (let i = 0; i < 5; i++) limiter.fail(`10.0.0.${i}`);
    assert.ok(limiter.retryAfter('10.0.0.99') > 0);
  });

  test('un login correcto limpia los fallos de esa IP', () => {
    const { limiter } = setup();
    limiter.fail('1.1.1.1');
    limiter.fail('1.1.1.1');
    limiter.succeed('1.1.1.1');
    limiter.fail('1.1.1.1');
    limiter.fail('1.1.1.1');
    assert.equal(limiter.retryAfter('1.1.1.1'), 0);
  });
});

describe('tope de tamaño y origen del pedido', () => {
  const h = (init: Record<string, string>) => new Headers(init);

  test('el cuerpo tiene que declarar su tamaño y entrar en el tope', () => {
    assert.equal(bodyWithin(h({ 'content-length': '120' }), 2000), true);
    assert.equal(bodyWithin(h({ 'content-length': '2000' }), 2000), true);
    assert.equal(bodyWithin(h({ 'content-length': '2001' }), 2000), false);
    assert.equal(bodyWithin(h({ 'content-length': '83886080' }), 2000), false);
    assert.equal(bodyWithin(h({}), 2000), false);
    assert.equal(bodyWithin(h({ 'content-length': '0' }), 2000), false);
    assert.equal(bodyWithin(h({ 'content-length': 'abc' }), 2000), false);
  });

  test('la IP sale del primer valor que manda el proxy', () => {
    assert.equal(clientIp(h({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
    assert.equal(clientIp(h({ 'x-real-ip': '203.0.113.9' })), '203.0.113.9');
    assert.equal(clientIp(h({})), 'desconocida');
  });
});
