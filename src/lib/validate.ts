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

// Un teléfono cualquiera (el WhatsApp del negocio, en Ajustes): se puede escribir con
// espacios, guiones, paréntesis o +. Devuelve solo los dígitos (de 8 a 15), o null si
// no parece un teléfono.
export function parsePhone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  if (!/^[\d\s()+.-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

// Por qué no sirve el teléfono de un pedido: le faltan números (o el código de área),
// o se nota inventado
export type PhoneError = 'incompleto' | 'inventado';
export type PhoneCheck = { ok: true; phone: string } | { ok: false; error: PhoneError };

// ¿Son números seguidos (2345678, 9876543, 7890123)?
function isRun(digits: string): boolean {
  let up = true;
  let down = true;
  for (let i = 1; i < digits.length; i++) {
    const step = (Number(digits[i]) - Number(digits[i - 1]) + 10) % 10;
    if (step !== 1) up = false;
    if (step !== 9) down = false;
  }
  return up || down;
}

// Teléfono de quien hace un pedido: un número argentino con código de área. Se puede
// escribir como salga (con +54, 9, 0, 15, espacios o guiones) y queda siempre igual:
// los 10 dígitos de área + número (011 15 4066-2350 → 1140662350).
// No puede saber si el número es de esa persona. Descarta lo que no puede ser un
// teléfono (largo o código de área imposibles) y lo que se nota inventado (casi todo
// el mismo número, o números seguidos como el del ejemplo del formulario).
export function checkCustomerPhone(value: unknown): PhoneCheck {
  const bad = (error: PhoneError): PhoneCheck => ({ ok: false, error });
  if (typeof value !== 'string' || value.length > 40 || !/^[\d\s()+.-]+$/.test(value))
    return bad('incompleto');

  let d = value.replace(/\D/g, '');
  // Lo que va antes del código de área: 00 y 54 (país), el 9 de los celulares y el 0
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('54')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('9')) d = d.slice(1);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  // El 15 de los celulares va después del área, que tiene 2, 3 o 4 dígitos
  if (d.length === 12) {
    const at = d.startsWith('11') ? 2 : d.startsWith('15', 3) ? 3 : 4;
    if (d.startsWith('15', at)) d = d.slice(0, at) + d.slice(at + 2);
  }

  // Área + número son 10 dígitos. El área es 11 o empieza con 2 o 3 (nunca 20, 21, 30
  // ni 31), y un número de Buenos Aires no empieza con 0 ni con 1.
  if (!/^(?:11[2-9]\d{7}|[23][2-9]\d{8})$/.test(d)) return bad('incompleto');

  if (new Set(d.slice(2)).size < 3 || isRun(d.slice(3))) return bad('inventado');
  return { ok: true, phone: d };
}

// Lo mismo, cuando solo importa el número: los 10 dígitos, o null
export function parseCustomerPhone(value: unknown): string | null {
  const check = checkCustomerPhone(value);
  return check.ok ? check.phone : null;
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
