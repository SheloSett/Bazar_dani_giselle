import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { authConfigError, createToken, verifyToken } from '@/lib/auth';

const SECRET = 'x'.repeat(40);
const FP = 'huella-de-la-clave';
const original = { ...process.env };

// process.env.NODE_ENV está tipado como solo lectura por Next
function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else (process.env as Record<string, string>)[k] = v;
  }
}

afterEach(() => {
  for (const k of ['NODE_ENV', 'SESSION_SECRET']) setEnv({ [k]: original[k] });
});

describe('sesión del admin', () => {
  test('un token recién creado es válido', async () => {
    setEnv({ SESSION_SECRET: SECRET });
    assert.equal(await verifyToken(await createToken(FP), FP), true);
  });

  test('rechaza tokens adulterados, vencidos o vacíos', async () => {
    setEnv({ SESSION_SECRET: SECRET });
    const token = await createToken(FP);
    const [exp, sig] = token.split('.');
    const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
    assert.equal(await verifyToken(`${exp}.${flipped}`, FP), false);
    assert.equal(await verifyToken(`${Number(exp) + 1}.${sig}`, FP), false);
    assert.equal(await verifyToken(`${Date.now() - 1000}.${sig}`, FP), false);
    assert.equal(await verifyToken(undefined, FP), false);
    assert.equal(await verifyToken('basura', FP), false);
  });

  test('cambiar la clave del admin (otra huella) invalida las sesiones abiertas', async () => {
    setEnv({ SESSION_SECRET: SECRET });
    const token = await createToken('huella-vieja');
    assert.equal(await verifyToken(token, 'huella-vieja'), true);
    assert.equal(await verifyToken(token, 'huella-nueva'), false);
  });

  test('cambiar SESSION_SECRET invalida las sesiones abiertas', async () => {
    setEnv({ SESSION_SECRET: SECRET });
    const token = await createToken(FP);
    setEnv({ SESSION_SECRET: 'y'.repeat(40) });
    assert.equal(await verifyToken(token, FP), false);
  });

  test('en producción exige un SESSION_SECRET largo', async () => {
    setEnv({ NODE_ENV: 'production', SESSION_SECRET: 'corto' });
    assert.match(authConfigError() ?? '', /SESSION_SECRET/);
    await assert.rejects(createToken(FP));
    assert.equal(await verifyToken('1.2', FP), false);

    setEnv({ SESSION_SECRET: undefined });
    assert.match(authConfigError() ?? '', /SESSION_SECRET/);

    setEnv({ SESSION_SECRET: SECRET });
    assert.equal(authConfigError(), null);
  });
});
