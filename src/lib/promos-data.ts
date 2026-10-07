// Promociones y cupones en la base (tabla promos). Las reglas de cálculo están en
// lib/promos.ts; acá solo se leen y se guardan.

import { query, type Query } from '@/lib/db';
import type { PromoInput, PromoRule, PublicPromo } from '@/lib/promos';

export type { PromoInput };

export interface AdminPromo extends PromoRule {
  starts_at: Date | null;
  ends_at: Date | null;
  created_at: Date;
  category_name: string | null;
  product_name: string | null;
}

const COLS = `pr.id, pr.name, pr.code, pr.kind, pr.value, pr.scope, pr.category_id, pr.product_id,
  pr.min_quantity, pr.min_total, pr.starts_at, pr.ends_at, pr.max_uses, pr.uses, pr.active,
  pr.created_at, c.name AS category_name, p.name AS product_name`;
const FROM = `FROM promos pr
  LEFT JOIN categories c ON c.id = pr.category_id
  LEFT JOIN products p ON p.id = pr.product_id`;

// Panel: todas, las activas primero
export function listPromos(): Promise<AdminPromo[]> {
  return query<AdminPromo>(`SELECT ${COLS} ${FROM} ORDER BY pr.active DESC, pr.created_at DESC, pr.id DESC`);
}

export async function getPromo(id: number): Promise<AdminPromo | null> {
  const rows = await query<AdminPromo>(`SELECT ${COLS} ${FROM} WHERE pr.id = $1`, [id]);
  return rows[0] ?? null;
}

// Catálogo: solo las automáticas que pueden aplicar hoy (sin cupones: los códigos no
// viajan al navegador). La vigencia se vuelve a mirar en el navegador y al guardar.
export function listPublicPromos(): Promise<PublicPromo[]> {
  return query<PublicPromo>(
    `SELECT pr.id, pr.name, pr.code, pr.kind, pr.value, pr.scope, pr.category_id, pr.product_id,
            pr.min_quantity, pr.min_total, pr.starts_at, pr.ends_at, pr.max_uses, pr.uses, pr.active
     ${FROM}
     WHERE pr.code IS NULL AND pr.active
       AND (pr.starts_at IS NULL OR pr.starts_at <= now())
       AND (pr.ends_at IS NULL OR pr.ends_at >= now())
       AND (pr.max_uses IS NULL OR pr.uses < pr.max_uses)
       AND (pr.scope <> 'product' OR p.visible)
     ORDER BY pr.created_at`
  );
}

// Un cupón por su código (ya normalizado). Puede estar vencido o pausado: eso lo
// decide quien llama, para poder explicarlo.
export async function findCoupon(code: string, q: Query = query): Promise<AdminPromo | null> {
  const rows = await q<AdminPromo>(`SELECT ${COLS} ${FROM} WHERE pr.code = $1`, [code]);
  return rows[0] ?? null;
}

// Las promociones que pueden aplicar ahora, con el cupón pedido si existe: lo que
// usa el servidor para calcular el descuento real de un pedido
export async function promosForOrder(code: string | null, q: Query = query): Promise<AdminPromo[]> {
  return q<AdminPromo>(
    `SELECT ${COLS} ${FROM}
     WHERE pr.active
       AND (pr.code IS NULL OR pr.code = $1)
       AND (pr.starts_at IS NULL OR pr.starts_at <= now())
       AND (pr.ends_at IS NULL OR pr.ends_at >= now())
       AND (pr.max_uses IS NULL OR pr.uses < pr.max_uses)`,
    [code ?? '']
  );
}

const VALUES = (i: PromoInput) => [
  i.name, i.code, i.kind, i.value, i.scope, i.category_id, i.product_id,
  i.min_quantity, i.min_total, i.starts_at, i.ends_at, i.max_uses, i.active,
];

export async function createPromo(input: PromoInput): Promise<AdminPromo> {
  const rows = await query<{ id: number }>(
    `INSERT INTO promos (name, code, kind, value, scope, category_id, product_id,
       min_quantity, min_total, starts_at, ends_at, max_uses, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    VALUES(input)
  );
  return (await getPromo(rows[0].id))!;
}

export async function updatePromo(id: number, input: PromoInput): Promise<AdminPromo | null> {
  const rows = await query<{ id: number }>(
    `UPDATE promos SET name = $2, code = $3, kind = $4, value = $5, scope = $6, category_id = $7,
       product_id = $8, min_quantity = $9, min_total = $10, starts_at = $11, ends_at = $12,
       max_uses = $13, active = $14
     WHERE id = $1 RETURNING id`,
    [id, ...VALUES(input)]
  );
  return rows.length ? getPromo(id) : null;
}

// Pausar o reactivar sin tocar el resto
export async function setPromoActive(id: number, active: boolean): Promise<AdminPromo | null> {
  const rows = await query<{ id: number }>('UPDATE promos SET active = $2 WHERE id = $1 RETURNING id', [id, active]);
  return rows.length ? getPromo(id) : null;
}

export async function deletePromo(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>('DELETE FROM promos WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

// Un uso más de un cupón (dentro de la transacción del pedido). Devuelve false si
// justo se agotó.
export async function consumeCoupon(id: number, q: Query): Promise<boolean> {
  const rows = await q<{ id: number }>(
    `UPDATE promos SET uses = uses + 1
     WHERE id = $1 AND (max_uses IS NULL OR uses < max_uses) RETURNING id`,
    [id]
  );
  return rows.length > 0;
}
