import { query } from '@/lib/db';
import { PUBLIC_STOCK_CAP } from '@/lib/catalog';
import { sameIdSet } from '@/lib/validate';

// ---------- tipos ----------

export interface Category {
  id: number;
  name: string;
  position: number;
  // Foto propia del rubro en el catálogo; null = se usa la del primer producto
  photo: string | null;
}

export interface PublicProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  // Precio anterior si está en oferta (se muestra tachado); null si no
  compare_price: number | null;
  // Unidades disponibles; null = no se controla el stock
  stock: number | null;
  category: string | null;
  photos: string[];
}

export interface AdminProduct extends PublicProduct {
  category_id: number | null;
  visible: boolean;
  position: number;
}

export interface AdminPhoto {
  id: number;
  filename: string;
  position: number;
}

// Ajustes de texto: los que se editan en el formulario del panel
export interface TextSettings {
  shop_name: string;
  whatsapp_phone: string;
  tagline: string;
  footer_note: string;
  // Los tres beneficios de la portada (título + aclaración). Un título vacío lo oculta.
  perk1_title: string;
  perk1_text: string;
  perk2_title: string;
  perk2_text: string;
  perk3_title: string;
  perk3_text: string;
}

export interface Settings extends TextSettings {
  // Logo del negocio (archivo en uploads). null = se muestra el nombre como texto.
  // No es un ajuste de texto: se cambia subiendo una imagen (setLogo).
  logo: string | null;
  // El logo es cuadrado o redondo: en los encabezados va con el nombre al lado
  logo_with_name: boolean;
}

export const SETTING_KEYS: (keyof TextSettings)[] = [
  'shop_name',
  'whatsapp_phone',
  'tagline',
  'footer_note',
  'perk1_title',
  'perk1_text',
  'perk2_title',
  'perk2_text',
  'perk3_title',
  'perk3_text',
];

const LOGO_KEY = 'logo';
const LOGO_NAME_KEY = 'logo_with_name';

// Lo que vale mientras el panel no lo cambie. Los beneficios arrancan con los textos
// que antes estaban fijos en el código.
const SETTINGS_DEFAULTS: Settings = {
  shop_name: 'Catálogo',
  whatsapp_phone: '',
  tagline: '',
  footer_note: '',
  perk1_title: 'Envío en el día',
  perk1_text: 'Coordinamos la entrega por WhatsApp',
  perk2_title: 'Retiro en el local',
  perk2_text: 'Pasá a buscar tu pedido',
  perk3_title: 'Pedido por WhatsApp',
  perk3_text: 'Armás la lista y la enviás en un toque',
  logo: null,
  logo_with_name: false,
};

// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const s = { ...SETTINGS_DEFAULTS };
  for (const r of rows) {
    if (r.key === LOGO_KEY) {
      s.logo = r.value || null;
    } else if (r.key === LOGO_NAME_KEY) {
      s.logo_with_name = r.value === '1';
    } else if ((SETTING_KEYS as string[]).includes(r.key)) {
      s[r.key as keyof TextSettings] = r.value;
    }
  }
  return s;
}

// Cambia (o quita, con null) el logo. withName: es cuadrado o redondo y va con el
// nombre al lado. Devuelve el archivo anterior, para borrarlo del disco.
export async function setLogo(
  filename: string | null,
  withName = false
): Promise<string | null> {
  const old = await query<{ value: string }>('SELECT value FROM settings WHERE key = $1', [
    LOGO_KEY,
  ]);
  if (filename) {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2), ($3, $4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [LOGO_KEY, filename, LOGO_NAME_KEY, withName ? '1' : '0']
    );
  } else {
    await query('DELETE FROM settings WHERE key = ANY($1)', [[LOGO_KEY, LOGO_NAME_KEY]]);
  }
  return old[0]?.value || null;
}

export async function updateSettings(entries: Partial<Settings>): Promise<void> {
  for (const key of SETTING_KEYS) {
    const value = entries[key];
    if (typeof value === 'string') {
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value.trim()]
      );
    }
  }
}

// ---------- categorías ----------

const CATEGORY_COLS = 'id, name, position, photo';

export async function listCategories(): Promise<Category[]> {
  return query<Category>(`SELECT ${CATEGORY_COLS} FROM categories ORDER BY position, name`);
}

export async function createCategory(name: string): Promise<Category> {
  const rows = await query<Category>(
    `INSERT INTO categories (name, position)
     VALUES ($1, COALESCE((SELECT MAX(position) + 1 FROM categories), 1))
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING ${CATEGORY_COLS}`,
    [name.trim()]
  );
  return rows[0];
}

// null si no existe. Un nombre repetido tira el error UNIQUE de Postgres (isUniqueViolation).
export async function renameCategory(id: number, name: string): Promise<Category | null> {
  const rows = await query<Category>(
    `UPDATE categories SET name = $2 WHERE id = $1 RETURNING ${CATEGORY_COLS}`,
    [id, name]
  );
  return rows[0] ?? null;
}

// Cambia (o quita, con null) la foto. Devuelve también la anterior, para borrar el archivo.
export async function setCategoryPhoto(
  id: number,
  photo: string | null
): Promise<{ category: Category; oldPhoto: string | null } | null> {
  const rows = await query<Category & { old_photo: string | null }>(
    `WITH old AS (SELECT photo FROM categories WHERE id = $1)
     UPDATE categories SET photo = $2 WHERE id = $1
     RETURNING ${CATEGORY_COLS}, (SELECT photo FROM old) AS old_photo`,
    [id, photo]
  );
  if (!rows[0]) return null;
  const { old_photo, ...category } = rows[0];
  return { category, oldPhoto: old_photo };
}

// Nuevo orden de los rubros del catálogo (y de sus pestañas). Devuelve false
// si los ids no son exactamente todas las categorías.
export async function reorderCategories(ids: number[]): Promise<boolean> {
  const current = await query<{ id: number }>('SELECT id FROM categories');
  if (!sameIdSet(current.map((c) => c.id), ids)) return false;
  // Una sola sentencia: o cambia todo el orden o no cambia nada
  await query(
    `UPDATE categories c SET position = v.pos
     FROM unnest($1::int[], $2::int[]) AS v(id, pos)
     WHERE c.id = v.id`,
    [ids, ids.map((_, i) => i + 1)]
  );
  return true;
}

// Devuelve la foto que tenía (para borrar el archivo), o null
export async function deleteCategory(id: number): Promise<string | null> {
  const rows = await query<{ photo: string | null }>(
    'DELETE FROM categories WHERE id = $1 RETURNING photo',
    [id]
  );
  return rows[0]?.photo ?? null;
}

// ---------- productos ----------

const PHOTO_AGG = `
  COALESCE(
    (SELECT json_agg(ph.filename ORDER BY ph.position, ph.id)
       FROM product_photos ph WHERE ph.product_id = p.id),
    '[]'::json
  ) AS photos
`;

const PRODUCT_COLS = 'p.id, p.name, p.description, p.price, p.compare_price, p.stock';

export async function listPublicProducts(): Promise<PublicProduct[]> {
  // Los productos sin stock van al final de su categoría.
  // El stock sale acotado (PUBLIC_STOCK_CAP): el número real solo lo ve el panel.
  return query<PublicProduct>(
    `SELECT p.id, p.name, p.description, p.price, p.compare_price,
            CASE WHEN p.stock IS NULL THEN NULL ELSE LEAST(p.stock, $1::int) END AS stock,
            c.name AS category, ${PHOTO_AGG}
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.visible
     ORDER BY c.position NULLS LAST, (COALESCE(p.stock, 1) = 0), p.position, p.id`,
    [PUBLIC_STOCK_CAP]
  );
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  return query<AdminProduct>(
    `SELECT ${PRODUCT_COLS}, p.category_id, p.visible, p.position,
            c.name AS category, ${PHOTO_AGG}
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY c.position NULLS LAST, p.position, p.id`
  );
}

export async function getAdminProduct(id: number): Promise<AdminProduct | null> {
  const rows = await query<AdminProduct>(
    `SELECT ${PRODUCT_COLS}, p.category_id, p.visible, p.position,
            c.name AS category, ${PHOTO_AGG}
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listProductPhotos(productId: number): Promise<AdminPhoto[]> {
  return query<AdminPhoto>(
    `SELECT id, filename, position FROM product_photos
     WHERE product_id = $1 ORDER BY position, id`,
    [productId]
  );
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  compare_price: number | null;
  stock: number | null;
  category_id: number | null;
  visible: boolean;
}

export async function createProduct(input: ProductInput): Promise<{ id: number }> {
  const rows = await query<{ id: number }>(
    `INSERT INTO products (name, description, price, compare_price, stock, category_id, visible, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
             COALESCE((SELECT MAX(position) + 1 FROM products), 1))
     RETURNING id`,
    [
      input.name,
      input.description,
      input.price,
      input.compare_price,
      input.stock,
      input.category_id,
      input.visible,
    ]
  );
  return rows[0];
}

export async function updateProduct(
  id: number,
  input: Partial<ProductInput>
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if (input.name !== undefined) add('name', input.name);
  if (input.description !== undefined) add('description', input.description);
  if (input.price !== undefined) add('price', input.price);
  if (input.compare_price !== undefined) add('compare_price', input.compare_price);
  if (input.stock !== undefined) add('stock', input.stock);
  if (input.category_id !== undefined) add('category_id', input.category_id);
  if (input.visible !== undefined) add('visible', input.visible);
  if (!sets.length) return;
  sets.push('updated_at = now()');
  params.push(id);
  await query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  );
}

// Nuevo orden de los productos de UN rubro (o de los que no tienen rubro). El
// catálogo ordena primero por categoría y después por posición, así que acá
// alcanza con renumerar los del rubro: el resto no se toca. Devuelve false si
// los ids no son exactamente todos los productos de un mismo rubro.
export async function reorderProducts(ids: number[]): Promise<boolean> {
  if (!ids.length) return false;
  const rows = await query<{ id: number; category_id: number | null }>(
    'SELECT id, category_id FROM products WHERE id = ANY($1::int[])',
    [ids]
  );
  // Si falta alguno (o hay repetidos), las cantidades no coinciden
  if (rows.length !== ids.length) return false;
  const categoryId = rows[0].category_id;
  if (rows.some((r) => r.category_id !== categoryId)) return false;

  const siblings = await query<{ id: number }>(
    categoryId === null
      ? 'SELECT id FROM products WHERE category_id IS NULL'
      : 'SELECT id FROM products WHERE category_id = $1',
    categoryId === null ? [] : [categoryId]
  );
  if (!sameIdSet(siblings.map((s) => s.id), ids)) return false;

  // Una sola sentencia: o cambia todo el orden o no cambia nada
  await query(
    `UPDATE products p SET position = v.pos
     FROM unnest($1::int[], $2::int[]) AS v(id, pos)
     WHERE p.id = v.id`,
    [ids, ids.map((_, i) => i + 1)]
  );
  return true;
}

export async function deleteProduct(id: number): Promise<string[]> {
  // Devuelve los archivos de fotos para que el caller los borre del disco
  const photos = await query<{ filename: string }>(
    'SELECT filename FROM product_photos WHERE product_id = $1',
    [id]
  );
  await query('DELETE FROM products WHERE id = $1', [id]);
  return photos.map((p) => p.filename);
}

// ---------- fotos ----------

export async function addPhoto(
  productId: number,
  filename: string
): Promise<AdminPhoto> {
  const rows = await query<AdminPhoto>(
    `INSERT INTO product_photos (product_id, filename, position)
     VALUES ($1, $2,
             COALESCE((SELECT MAX(position) + 1 FROM product_photos WHERE product_id = $1), 1))
     RETURNING id, filename, position`,
    [productId, filename]
  );
  return rows[0];
}

// Nuevo orden de las fotos de un producto (la primera es la portada).
// Devuelve false si los ids no son exactamente las fotos de ese producto.
export async function reorderPhotos(productId: number, ids: number[]): Promise<boolean> {
  const current = (await listProductPhotos(productId)).map((p) => p.id).sort((a, b) => a - b);
  const given = [...ids].sort((a, b) => a - b);
  if (current.length !== given.length || current.some((id, i) => id !== given[i])) return false;
  // Una sola sentencia: o cambia todo el orden o no cambia nada
  await query(
    `UPDATE product_photos ph SET position = v.pos
     FROM unnest($1::int[], $2::int[]) AS v(id, pos)
     WHERE ph.id = v.id AND ph.product_id = $3`,
    [ids, ids.map((_, i) => i + 1), productId]
  );
  return true;
}

export async function deletePhoto(id: number): Promise<string | null> {
  const rows = await query<{ filename: string }>(
    'DELETE FROM product_photos WHERE id = $1 RETURNING filename',
    [id]
  );
  return rows[0]?.filename ?? null;
}
