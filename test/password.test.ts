import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, samePlainPassword, verifyPasswordHash } from '@/lib/password';
import { checkPassword, credentialFingerprint } from '@/lib/credentials';

describe('hash de la clave del admin', () => {
  test('una clave verifica contra su propio hash y contra ningún otro', async () => {
    const stored = await hashPassword('mi clave segura');
    assert.match(stored, /^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    assert.equal(await verifyPasswordHash('mi clave segura', stored), true);
    assert.equal(await verifyPasswordHash('mi clave segur', stored), false);
    assert.equal(await verifyPasswordHash('', stored), false);
  });

  test('dos hashes de la misma clave son distintos (sal aleatoria)', async () => {
    assert.notEqual(await hashPassword('igual'), await hashPassword('igual'));
  });

  test('un hash roto o vacío nunca verifica', async () => {
    for (const stored of ['', 'basura', 'scrypt$16384$8$1$$', 'md5$x$y$z$aa$bb', 'scrypt$16384$8$1$zz$']) {
      assert.equal(await verifyPasswordHash('lo que sea', stored), false, stored);
    }
  });

  test('comparación de claves en texto plano', () => {
    assert.equal(samePlainPassword('abc', 'abc'), true);
    assert.equal(samePlainPassword('abc', 'abd'), false);
    assert.equal(samePlainPassword('abc', 'abcd'), false);
  });
});

describe('clave vigente', () => {
  test('la del .env se compara en texto plano; la de la base, contra el hash', async () => {
    const env = { kind: 'env', password: 'inicial' } as const;
    assert.equal(await checkPassword(env, 'inicial'), true);
    assert.equal(await checkPassword(env, 'otra'), false);

    const db = { kind: 'db', hash: await hashPassword('nueva') } as const;
    assert.equal(await checkPassword(db, 'nueva'), true);
    assert.equal(await checkPassword(db, 'inicial'), false);
  });

  test('la huella cambia cuando cambia la clave', async () => {
    const a = credentialFingerprint({ kind: 'db', hash: await hashPassword('una') });
    const b = credentialFingerprint({ kind: 'db', hash: await hashPassword('otra') });
    assert.notEqual(a, b);
    assert.notEqual(a, credentialFingerprint({ kind: 'env', password: 'una' }));
  });
});
