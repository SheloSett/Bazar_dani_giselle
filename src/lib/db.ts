import { Pool } from 'pg';

// Pool único reutilizado entre requests (y entre recargas del dev server)
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgres://bazar:bazar@localhost:5433/bazar',
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;

// Error de Postgres por clave foránea inexistente (ej: category_id que no existe)
export function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === '23503';
}

// Error de Postgres por valor repetido en una columna UNIQUE (ej: nombre de categoría)
export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === '23505';
}

export async function query<T = unknown>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(text, params as never[]);
  return res.rows as T[];
}
