import { query } from '@/lib/db';

// ---------- tipos ----------

export interface Category {
  id: number;
  name: string;
  position: number;
}

export interface PublicProduct {
  id: number;
  name: string;
  description: string;
  price: number;
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

export async function listCategories(): Promise<Category[]> {
  return query<Category>(
    'SELECT id, name, position FROM categories ORDER BY position, name'
  );
}

export async function createCategory(name: string): Promise<Category> {
  const rows = await query<Category>(
    `INSERT INTO categories (name, position)
     VALUES ($1, COALESCE((SELECT MAX(position) + 1 FROM categories), 1))
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, position`,
    [name.trim()]
  );
  return rows[0];
}

export async function deleteCategory(id: number): Promise<void> {
  await query('DELETE FROM categories WHERE id = $1', [id]);
}

// ---------- productos ----------

const PHOTO_AGG = `
  COALESCE(
    (SELECT json_agg(ph.filename ORDER BY ph.position, ph.id)
       FROM product_photos ph WHERE ph.product_id = p.id),
    '[]'::json
  ) AS photos
`;

export async function listPublicProducts(): Promise<PublicProduct[]> {
  return query<PublicProduct>(
    `SELECT p.id, p.name, p.description, p.price, c.name AS category, ${PHOTO_AGG}
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.visible
     ORDER BY c.position NULLS LAST, p.position, p.id`
  );
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  return query<AdminProduct>(
    `SELECT p.id, p.name, p.description, p.price, p.category_id, p.visible,
            p.position, c.name AS category, ${PHOTO_AGG}
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY c.position NULLS LAST, p.position, p.id`
  );
}

export async function getAdminProduct(id: number): Promise<AdminProduct | null> {
  const rows = await query<AdminProduct>(
    `SELECT p.id, p.name, p.description, p.price, p.category_id, p.visible,
            p.position, c.name AS category, ${PHOTO_AGG}
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
  category_id: number | null;
  visible: boolean;
}

export async function createProduct(input: ProductInput): Promise<{ id: number }> {
  const rows = await query<{ id: number }>(
    `INSERT INTO products (name, description, price, category_id, visible, position)
     VALUES ($1, $2, $3, $4, $5,
             COALESCE((SELECT MAX(position) + 1 FROM products), 1))
     RETURNING id`,
    [input.name, input.description, input.price, input.category_id, input.visible]
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

export async function deletePhoto(id: number): Promise<string | null> {
  const rows = await query<{ filename: string }>(
    'DELETE FROM product_photos WHERE id = $1 RETURNING filename',
    [id]
  );
  return rows[0]?.filename ?? null;
}
