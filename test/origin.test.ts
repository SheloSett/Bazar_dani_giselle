import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCrossOrigin } from '@/lib/origin';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const h = (headers: Record<string, string>) => new Headers(headers);

describe('control de origen de los pedidos al panel', () => {
  test('un pedido del propio sitio pasa', () => {
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', origin: 'https://bazar.com', 'sec-fetch-site': 'same-origin' })), false);
    assert.equal(isCrossOrigin(h({ host: 'localhost:3000', origin: 'http://localhost:3000' })), false);
  });

  test('detrás del proxy vale el host que vio el navegador', () => {
    assert.equal(isCrossOrigin(h({ host: 'app:3000', 'x-forwarded-host': 'bazar.com', origin: 'https://bazar.com' })), false);
    assert.equal(isCrossOrigin(h({ host: 'app:3000', 'x-forwarded-host': 'bazar.com, otro', origin: 'https://bazar.com' })), false);
  });

  test('otro sitio, otro subdominio u otro puerto no pasan', () => {
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', origin: 'https://malo.com' })), true);
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', origin: 'https://otra.bazar.com' })), true);
    assert.equal(isCrossOrigin(h({ host: '82.25.74.242:3010', origin: 'http://82.25.74.242:8080' })), true);
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', origin: 'https://bazar.com', 'sec-fetch-site': 'same-site' })), true);
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', 'sec-fetch-site': 'cross-site' })), true);
  });

  test('un origen ilegible no pasa', () => {
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', origin: 'null' })), true);
  });

  test('sin Origin (no es un navegador) pasa: lo frena la sesión', () => {
    assert.equal(isCrossOrigin(h({ host: 'bazar.com' })), false);
    assert.equal(isCrossOrigin(h({ host: 'bazar.com', 'sec-fetch-site': 'none' })), false);
  });
});

// Las rutas del panel que cambian algo llevan el control cada una. Si alguien suma
// una ruta nueva y se lo olvida, o devuelve la API al middleware, esto avisa.
describe('rutas del panel', () => {
  const routes = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? routes(path.join(dir, e.name)) : e.name === 'route.ts' ? [path.join(dir, e.name)] : []
    );
  const files = routes(path.join(root, 'src', 'app', 'api', 'admin'));

  test('cada POST, PATCH, PUT y DELETE controla el origen antes de hacer nada', () => {
    let handlers = 0;
    for (const file of files) {
      const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const parts = source.split(/(?=^export async function )/m).slice(1);
      for (const part of parts) {
        const method = /^export async function (\w+)\(/.exec(part)?.[1];
        if (!method || !['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) continue;
        handlers++;
        // lo primero del cuerpo: el rechazo con sesión, o el control de origen (login y logout)
        const first = part.slice(part.indexOf('{\n') + 2).trimStart();
        assert.ok(
          first.startsWith('const denied = await denyAdminWrite(req);\n  if (denied) return denied;') ||
            first.startsWith('if (isCrossOrigin(req.headers))'),
          `${path.relative(root, file)} ${method} no controla el origen al empezar`
        );
      }
    }
    assert.ok(handlers >= 18, `se esperaban al menos 18 rutas, hay ${handlers}`);
  });

  test('la API del panel no pasa por el middleware (rompe las subidas grandes)', () => {
    const source = readFileSync(path.join(root, 'src', 'middleware.ts'), 'utf8');
    const matcher = /matcher: \[([^\]]*)\]/.exec(source)?.[1] ?? '';
    assert.ok(matcher.includes("'/admin/:path*'"), matcher);
    assert.ok(!matcher.includes('/api'), matcher);
  });
});
