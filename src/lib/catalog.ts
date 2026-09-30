// Helpers puros del catálogo, compartidos por servidor y navegador (sin Node ni base)

import type { PublicProduct } from '@/lib/data';

// Punto de miles armado a mano: toLocaleString depende de los datos de idioma de cada
// motor (6800 puede salir "6.800", "6800" o "6,800") y la diferencia entre el servidor
// y el navegador rompe la hidratación de React
export const money = (n: number) =>
  '$ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Con esta cantidad o menos se avisa que quedan pocas unidades
export const LOW_STOCK = 3;

// stock null = no se controla: siempre disponible
export function maxQuantity(stock: number | null): number {
  return stock === null ? Infinity : Math.max(0, stock);
}

export function isOutOfStock(stock: number | null): boolean {
  return stock !== null && stock <= 0;
}

// Aviso de stock para mostrar, o null si no hay nada que avisar
export function stockLabel(stock: number | null): string | null {
  if (stock === null) return null;
  if (stock <= 0) return 'Sin stock';
  if (stock === 1) return 'Última unidad';
  if (stock <= LOW_STOCK) return `Quedan ${stock}`;
  return null;
}

// Descuento entero respecto del precio anterior, o null si no hay oferta real
export function discountPercent(price: number, comparePrice: number | null): number | null {
  if (comparePrice === null || comparePrice <= 0 || comparePrice <= price) return null;
  const pct = Math.round((1 - price / comparePrice) * 100);
  return pct >= 1 ? pct : null;
}

// Minúsculas y sin tildes: "cafe" encuentra "Cafetera"
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Todas las palabras buscadas tienen que aparecer en nombre, descripción o categoría
export function matchesSearch(
  p: Pick<PublicProduct, 'name' | 'description' | 'category'>,
  term: string
): boolean {
  const words = normalizeText(term).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = normalizeText(`${p.name} ${p.description} ${p.category ?? ''}`);
  return words.every((w) => hay.includes(w));
}

// ---------- URLs de fotos ----------

// Miniatura que la app genera junto a cada foto (ver lib/uploads.ts)
export function thumbName(filename: string): string {
  return filename.replace(/\.(jpg|png|webp|avif)$/, '.t.webp');
}

export const photoUrl = (filename: string) => `/uploads/${filename}`;
export const thumbUrl = (filename: string) => `/uploads/${thumbName(filename)}`;

// Imagen JPEG para la vista previa al compartir el link (WhatsApp no muestra WebP)
export const ogImagePath = (filename: string) => `/og/${filename.replace(/\.\w+$/, '')}.jpg`;
