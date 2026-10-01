import { query } from '@/lib/db';

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

export interface Settings {
  shop_name: string;
  whatsapp_phone: string;
  tagline: string;
  footer_note: string;
}

export const SETTING_KEYS: (keyof Settings)[] = [
  'shop_name',
  'whatsapp_phone',
  'tagline',
  'footer_note',
];

const SETTINGS_DEFAULTS: Settings = {
  shop_name: 'Catálogo',
  whatsapp_phone: '',
  tagline: '',
  footer_note: '',
};

// ---------- settings ----------

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const s = { ...SETTINGS_DEFAULTS };
  for (const r of rows) {
    if ((SETTING_KEYS as string[]).includes(r.key)) {
      s[r.key as keyof Settings] = r.value;
    }
  }
  return s;
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
  // Los productos sin stock van al final de su categoría
  return query<PublicProduct>(
    `SELECT ${PRODUCT_COLS}, c.name AS category, ${PHOTO_AGG}
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.visible
     ORDER BY c.position NULLS LAST, (COALESCE(p.stock, 1) = 0), p.position, p.id`
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
