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

export const CATEGORY_NAME_MAX = 60;

// Nombre de categoría: sin espacios de más, de 1 a 60 caracteres, o null
export function parseCategoryName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name && name.length <= CATEGORY_NAME_MAX ? name : null;
}

// ---------- pedidos (ruta pública: todo lo que llega se valida) ----------

// Código del link de un pedido: lo genera el navegador, 12 bytes al azar en base64url
export const ORDER_TOKEN_RE = /^[A-Za-z0-9_-]{16,40}$/;
export const MAX_ORDER_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 9999;

// Ítems de un pedido: [{ id, quantity }] → lista sin productos repetidos (se suman
// las cantidades), o null si algo no es válido. Los precios no vienen de acá:
// los pone el servidor.
export function parseOrderItems(value: unknown): { id: number; quantity: number }[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ORDER_ITEMS) return null;
  const byId = new Map<number, number>();
  for (const raw of value) {
    const item = raw as { id?: unknown; quantity?: unknown } | null;
    const id = parseId(item?.id);
    const quantity = item?.quantity;
    if (id === null || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1)
      return null;
    const sum = (byId.get(id) ?? 0) + quantity;
    if (sum > MAX_ITEM_QUANTITY) return null;
    byId.set(id, sum);
  }
  return [...byId].map(([id, quantity]) => ({ id, quantity }));
}

// ¿Dos pedidos tienen exactamente los mismos productos y cantidades? Para no
// guardar de nuevo el mismo pedido reenviado (ver createOrder).
export function sameOrderItems(
  a: { id: number; quantity: number }[],
  b: { id: number; quantity: number }[]
): boolean {
  if (a.length !== b.length) return false;
  const key = (list: { id: number; quantity: number }[]) =>
    list.map((x) => `${x.id}x${x.quantity}`).sort().join(',');
  return key(a) === key(b);
}

export const CUSTOMER_NAME_MAX = 80;

// Nombre de quien pide: sin espacios de más, de 2 a 80 caracteres, o null
export function parseCustomerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= CUSTOMER_NAME_MAX ? name : null;
}

// Teléfono de quien pide: se puede escribir con espacios, guiones, paréntesis o +.
// Devuelve solo los dígitos (de 8 a 15), o null si no parece un teléfono.
export function parsePhone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  if (!/^[\d\s()+.-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

// ---------- reordenamiento (orden manual de productos y categorías) ----------

export const MAX_ORDER_IDS = 1000;

// Lista de ids ({ order: [ids…] } de las rutas de reordenamiento), o null si
// algo de la lista no es un id válido
export function parseIdList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ORDER_IDS) return null;
  const ids = value.map(parseId);
  return ids.every((n): n is number => n !== null) ? (ids as number[]) : null;
}

// ¿Las dos listas tienen exactamente los mismos ids? Así un reordenamiento no
// puede sumar, repetir ni dejar afuera elementos: solo cambiarlos de lugar.
export function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((id, i) => id === sb[i]);
}
