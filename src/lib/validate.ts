// Validaciones compartidas por las rutas de la API

// Máximo de una columna INT/INTEGER de Postgres
const PG_INT_MAX = 2_147_483_647;

const isBlank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim());

// Id (de la URL o del body) → entero positivo que entra en la columna, o null
export function parseId(value: unknown): number | null {
  const s = typeof value === 'number' ? String(value) : value;
  if (typeof s !== 'string' || !/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= PG_INT_MAX ? n : null;
}

// Precio en pesos sin centavos (se redondea), o null si no es válido
export function parsePrice(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 && n <= PG_INT_MAX ? n : null;
}

// Precio opcional (ej: precio anterior de una oferta). Vacío o 0 = sin valor.
// Devuelve { value } o null si lo que llegó no es un precio.
export function parseOptionalPrice(value: unknown): { value: number | null } | null {
  if (isBlank(value)) return { value: null };
  const n = parsePrice(value);
  if (n === null) return null;
  return { value: n > 0 ? n : null };
}

// Stock: vacío = sin control. Si viene, entero >= 0.
// Devuelve { value } o null si lo que llegó no es válido.
export function parseStock(value: unknown): { value: number | null } | null {
  if (isBlank(value)) return { value: null };
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const s = String(value).trim();
  if (!/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  return n <= PG_INT_MAX ? { value: n } : null;
}
