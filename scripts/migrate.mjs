// Aplica db/schema.sql y, si la base está vacía, db/seed.sql.
// Se corre al arrancar el contenedor y también a mano con: npm run db:init

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = (file) => readFileSync(path.join(here, '..', 'db', file), 'utf8');

// En Docker llega por environment; en local, npm run db:init carga el .env
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://bazar:bazar@localhost:5433/bazar';

async function connectWithRetry(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    const client = new pg.Client({ connectionString: DATABASE_URL });
    try {
      await client.connect();
      return client;
    } catch (err) {
      await client.end().catch(() => {});
      if (i === retries) throw err;
      console.log(`[migrate] esperando a la base de datos… (${i}/${retries})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

const client = await connectWithRetry();
try {
  console.log('[migrate] aplicando schema.sql');
  await client.query(sql('schema.sql'));

  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM products');
  if (rows[0].n === 0) {
    console.log('[migrate] base vacía: cargando seed.sql');
    await client.query(sql('seed.sql'));
  } else {
    console.log(`[migrate] base con ${rows[0].n} productos: no se carga el seed`);
  }
  console.log('[migrate] listo');
} finally {
  await client.end();
}
