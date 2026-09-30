// Para cuando se olvida la clave del panel: borra la clave guardada desde el
// panel y vuelve a valer la inicial del .env (ADMIN_PASSWORD). También cierra
// todas las sesiones abiertas.
//   local:  npm run admin:reset
//   VPS:    docker compose exec app node scripts/reset-password.mjs

import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://bazar:bazar@localhost:5433/bazar';

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  const { rowCount } = await client.query(
    "DELETE FROM settings WHERE key = 'admin_password_hash'"
  );
  if (rowCount) {
    console.log('[reset] listo: vuelve a valer la clave ADMIN_PASSWORD del .env.');
    console.log('[reset] Las sesiones abiertas del panel se cerraron.');
  } else {
    console.log('[reset] no había clave guardada desde el panel: ya vale la del .env.');
  }
} finally {
  await client.end();
}
