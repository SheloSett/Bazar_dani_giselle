// Pedidos armados en el catálogo. Se guardan al tocar "Enviar pedido por WhatsApp":
// quedan en el panel y el mensaje lleva un link al detalle con fotos.

import { isUniqueViolation, query, transaction } from '@/lib/db';
import { planStock, type ShortItem, type StockLine } from '@/lib/order-rules';
import { sameOrderItems } from '@/lib/validate';

// Máximo de una columna INTEGER de Postgres (el total del pedido)
const PG_INT_MAX = 2_147_483_647;

export interface OrderItem {
  product_id: number | null;
  name: string;
  price: number;
  quantity: number;
  photo: string | null;
}

// Lo que muestra la página pública del link: sin datos de quien pidió
export interface Order {
  id: number;
  token: string;
  total: number;
  created_at: Date;
  items: OrderItem[];
}

// Cada renglón como lo ve el panel: suma el stock
export interface AdminOrderItem extends OrderItem {
  // Unidades que descontó del stock al confirmarse el pedido (0 = nada)
  stock_taken: number;
  // Stock que tiene hoy el producto; null = no se controla o el producto ya no existe
  stock: number | null;
}

// Lo que ve el panel: suma nombre y teléfono del cliente
export interface AdminOrder extends Order {
  customer_name: string;
  customer_phone: string;
  // Cuándo se marcó como confirmado desde el panel; null = pendiente
  confirmed_at: Date | null;
  items: AdminOrderItem[];
}

export interface OrderSummary {
  id: number;
  total: number;
  created_at: Date;
  customer_name: string;
  customer_phone: string;
  units: number;
  confirmed_at: Date | null;
  // Días enteros desde que se hizo el pedido
  waiting_days: number;
}

// Para el recordatorio del panel
export interface PendingSummary {
  // Pedidos sin confirmar
  count: number;
  // De esos, los que esperan hace más de un día
  stale: number;
  // Días que lleva esperando el más viejo
  oldest_days: number;
}

export type ConfirmResult =
  | { status: 'ok' }
  | { status: 'missing' }
  // No alcanza el stock de estos productos: no se confirmó
  | { status: 'short'; short: ShortItem[] };

export interface Customer {
  name: string;
  phone: string;
}

export type CreateOrderResult = 'created' | 'exists' | 'empty' | 'too-big';

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});
const shortDateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});

// Fecha y hora de Argentina (solo para páginas del servidor)
export const formatOrderDate = (d: Date) => dateFormat.format(d);
export const formatOrderDateShort = (d: Date) => shortDateFormat.format(d);

// Guarda el pedido con el nombre, el precio y la foto que cada producto tiene
// AHORA en la base: del navegador solo se toman qué productos, cuántos y los
// datos del cliente (ya validados). Los productos ocultos o que ya no existen
// se dejan afuera.
export async function createOrder(
  token: string,
  wanted: { id: number; quantity: number }[],
  customer: Customer
): Promise<CreateOrderResult> {
  const products = await query<{ id: number; name: string; price: number; photo: string | null }>(
    `SELECT p.id, p.name, p.price,
            (SELECT ph.filename FROM product_photos ph
              WHERE ph.product_id = p.id ORDER BY ph.position, ph.id LIMIT 1) AS photo
     FROM products p
     WHERE p.visible AND p.id = ANY($1::int[])`,
    [wanted.map((w) => w.id)]
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = wanted.flatMap((w) => {
    const p = byId.get(w.id);
    return p ? [{ ...p, quantity: w.quantity }] : [];
  });
  if (!lines.length) return 'empty';

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  if (total > PG_INT_MAX) return 'too-big';

  // Pedido repetido: la misma persona (mismo teléfono) ya mandó exactamente los
  // mismos productos y cantidades en las últimas 24 horas (reenvíos del mismo
  // carrito, otra pestaña, otro dispositivo). No se guarda otra vez, así el
  // panel no se llena de copias. El mismo pedido días después es uno nuevo.
  const recent = await query<{ order_id: number; product_id: number | null; quantity: number }>(
    `SELECT i.order_id, i.product_id, i.quantity
     FROM orders o JOIN order_items i ON i.order_id = o.id
     WHERE o.customer_phone = $1 AND o.created_at > now() - interval '24 hours'`,
    [customer.phone]
  );
  if (recent.length) {
    const byOrder = new Map<number, { id: number; quantity: number }[]>();
    for (const r of recent) {
      const list = byOrder.get(r.order_id) ?? [];
      // product_id null = producto borrado después: -1 nunca coincide con uno actual
      list.push({ id: r.product_id ?? -1, quantity: r.quantity });
      byOrder.set(r.order_id, list);
    }
    const newItems = lines.map((l) => ({ id: l.id, quantity: l.quantity }));
    for (const items of byOrder.values())
      if (sameOrderItems(items, newItems)) return 'exists';
  }

  try {
    // Una sola sentencia: o se guarda el pedido entero o no se guarda nada
    await query(
      `WITH o AS (
         INSERT INTO orders (token, total, customer_name, customer_phone)
         VALUES ($1, $2, $9, $10) RETURNING id
       )
       INSERT INTO order_items (order_id, product_id, name, price, quantity, photo, position)
       SELECT o.id, v.product_id, v.name, v.price, v.quantity, v.photo, v.position
       FROM o, unnest($3::int[], $4::text[], $5::int[], $6::int[], $7::text[], $8::int[])
            AS v(product_id, name, price, quantity, photo, position)`,
      [
        token,
        total,
        lines.map((l) => l.id),
        lines.map((l) => l.name),
        lines.map((l) => l.price),
        lines.map((l) => l.quantity),
        lines.map((l) => l.photo),
        lines.map((_, i) => i + 1),
        customer.name,
        customer.phone,
      ]
    );
  } catch (err) {
    // El mismo pedido enviado dos veces (doble toque): ya está guardado
    if (isUniqueViolation(err)) return 'exists';
    throw err;
  }
  return 'created';
}

function orderItems(orderId: number): Promise<OrderItem[]> {
  return query<OrderItem>(
    `SELECT product_id, name, price, quantity, photo FROM order_items
     WHERE order_id = $1 ORDER BY position, id`,
    [orderId]
  );
}

// Para la página pública: a propósito no trae los datos del cliente
export async function getOrder(token: string): Promise<Order | null> {
  const rows = await query<Omit<Order, 'items'>>(
    'SELECT id, token, total, created_at FROM orders WHERE token = $1',
    [token]
  );
  const order = rows[0];
  return order ? { ...order, items: await orderItems(order.id) } : null;
}

// ---------- panel ----------

// Primero los pendientes (lo que falta resolver), después los confirmados
export async function listOrders(): Promise<OrderSummary[]> {
  return query<OrderSummary>(
    `SELECT o.id, o.total, o.created_at, o.customer_name, o.customer_phone, o.confirmed_at,
            COALESCE((SELECT SUM(quantity) FROM order_items i WHERE i.order_id = o.id), 0)::int AS units,
            EXTRACT(DAY FROM now() - o.created_at)::int AS waiting_days
     FROM orders o
     ORDER BY (o.confirmed_at IS NOT NULL), o.created_at DESC, o.id DESC
     LIMIT 500`
  );
}

export async function pendingSummary(): Promise<PendingSummary> {
  const rows = await query<PendingSummary>(
    `SELECT COUNT(*)::int AS count,
            (COUNT(*) FILTER (WHERE created_at < now() - interval '1 day'))::int AS stale,
            COALESCE(EXTRACT(DAY FROM now() - MIN(created_at)), 0)::int AS oldest_days
     FROM orders WHERE confirmed_at IS NULL`
  );
  return rows[0];
}

export async function getAdminOrder(id: number): Promise<AdminOrder | null> {
  const rows = await query<Omit<AdminOrder, 'items'>>(
    `SELECT id, token, total, created_at, customer_name, customer_phone, confirmed_at
     FROM orders WHERE id = $1`,
    [id]
  );
  const order = rows[0];
  if (!order) return null;
  const items = await query<AdminOrderItem>(
    `SELECT i.product_id, i.name, i.price, i.quantity, i.photo, i.stock_taken, p.stock
     FROM order_items i LEFT JOIN products p ON p.id = i.product_id
     WHERE i.order_id = $1 ORDER BY i.position, i.id`,
    [order.id]
  );
  return { ...order, items };
}

// Marca el pedido como confirmado (se hizo la venta) y descuenta sus unidades del
// stock de cada producto que lo controla. Si de alguno no alcanza, no confirma y
// devuelve cuáles; con force confirma igual y descuenta lo que haya (el stock no
// baja de 0). Cada renglón anota lo que descontó, para poder devolverlo.
export async function confirmOrder(id: number, force = false): Promise<ConfirmResult> {
  return transaction<ConfirmResult>(async (q) => {
    // FOR UPDATE: dos toques seguidos al botón no descuentan dos veces
    const orders = await q<{ confirmed_at: Date | null }>(
      'SELECT confirmed_at FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!orders.length) return { status: 'missing' };
    if (orders[0].confirmed_at) return { status: 'ok' };

    const lines = await q<StockLine>(
      `SELECT i.id AS "itemId", p.id AS "productId", i.name, i.quantity, p.stock
       FROM order_items i JOIN products p ON p.id = i.product_id
       WHERE i.order_id = $1 AND p.stock IS NOT NULL
       ORDER BY p.id, i.id
       FOR UPDATE OF p`,
      [id]
    );
    const plan = planStock(lines);
    if (plan.short.length && !force) return { status: 'short', short: plan.short };

    await q(
      `UPDATE order_items i SET stock_taken = v.take
       FROM unnest($1::int[], $2::int[]) AS v(id, take) WHERE i.id = v.id`,
      [plan.takes.map((t) => t.itemId), plan.takes.map((t) => t.take)]
    );
    await q(
      `UPDATE products p SET stock = v.stock
       FROM unnest($1::int[], $2::int[]) AS v(id, stock) WHERE p.id = v.id`,
      [plan.stock.map((s) => s.productId), plan.stock.map((s) => s.stock)]
    );
    await q('UPDATE orders SET confirmed_at = now() WHERE id = $1', [id]);
    return { status: 'ok' };
  });
}

// Vuelve el pedido a pendiente y devuelve al stock lo que había descontado (a los
// productos que siguen existiendo y controlando stock). Devuelve false si el
// pedido no existe.
export async function unconfirmOrder(id: number): Promise<boolean> {
  return transaction(async (q) => {
    const orders = await q<{ confirmed_at: Date | null }>(
      'SELECT confirmed_at FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!orders.length) return false;
    if (!orders[0].confirmed_at) return true;

    await q(
      `UPDATE products p SET stock = p.stock + t.units
       FROM (SELECT product_id, SUM(stock_taken)::int AS units FROM order_items
             WHERE order_id = $1 AND stock_taken > 0 AND product_id IS NOT NULL
             GROUP BY product_id) t
       WHERE p.id = t.product_id AND p.stock IS NOT NULL`,
      [id]
    );
    await q('UPDATE order_items SET stock_taken = 0 WHERE order_id = $1', [id]);
    await q('UPDATE orders SET confirmed_at = NULL WHERE id = $1', [id]);
    return true;
  });
}

// Eliminar un pedido no toca el stock: uno confirmado ya se vendió. Si la venta se
// canceló, primero se lo vuelve a pendiente (eso sí devuelve las unidades).
export async function deleteOrder(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}
