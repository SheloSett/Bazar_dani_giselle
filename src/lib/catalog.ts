// Helpers puros del catálogo, compartidos por servidor y navegador (sin Node ni base)

import type { PublicProduct } from '@/lib/data';

// Punto de miles armado a mano: toLocaleString depende de los datos de idioma de cada
// motor (6800 puede salir "6.800", "6800" o "6,800") y la diferencia entre el servidor
// y el navegador rompe la hidratación de React
export const money = (n: number) =>
  '$ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Con esta cantidad o menos se avisa que quedan pocas unidades
export const LOW_STOCK = 3;

// El catálogo público no manda el stock real por encima de este número: con 500
// unidades llega "20". Así no queda a la vista cuánta mercadería hay, y es también
// el máximo de un mismo producto que se puede sumar a un pedido.
export const PUBLIC_STOCK_CAP = 20;

// stock null = no se controla: siempre disponible
export function maxQuantity(stock: number | null): number {
  return stock === null ? Infinity : Math.max(0, stock);
}

export function isOutOfStock(stock: number | null): boolean {
  return stock !== null && stock <= 0;
}

// Etiqueta corta de la tarjeta, o null si no hay nada que avisar
export function stockLabel(stock: number | null): string | null {
  if (stock === null) return null;
  if (stock <= 0) return 'Sin stock';
  if (stock === 1) return 'Última unidad';
  if (stock <= LOW_STOCK) return 'Últimas unidades';
  return null;
}

// Cantidad exacta cuando quedan pocas: en la ficha y al pasar el mouse por la etiqueta
export function stockDetail(stock: number | null): string | null {
  if (stock === null || stock <= 0 || stock > LOW_STOCK) return null;
  return stock === 1 ? 'Queda 1 unidad' : `Quedan ${stock} unidades`;
}

// Aviso cuando productos guardados en el carrito ya no están en el catálogo (se
// ocultaron o se borraron). `unnamed`: los de carritos viejos, sin el nombre guardado.
export function unavailableNotice(names: string[], unnamed = 0): string | null {
  const total = names.length + unnamed;
  if (!total) return null;
  if (names.length === 1 && !unnamed)
    return `«${names[0]}» ya no está disponible y lo sacamos de tu pedido.`;
  if (!names.length)
    return total === 1
      ? '1 producto de tu pedido ya no está disponible y lo sacamos.'
      : `${total} productos de tu pedido ya no están disponibles y los sacamos.`;
  const more = unnamed ? ` y ${unnamed} ${unnamed === 1 ? 'producto más' : 'productos más'}` : '';
  const list = names.map((n) => `«${n}»`).join(', ');
  return `Estos productos ya no están disponibles y los sacamos de tu pedido: ${list}${more}.`;
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

// ---------- WhatsApp ----------

// Teléfono de un cliente → número para wa.me. Los celulares argentinos van como
// 549 + área + número: se completa lo que falte. Si no parece argentino, queda igual.
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('549')) return d;
  if (d.startsWith('54')) return '549' + d.slice(2);
  const local = d.replace(/^0/, ''); // 011… → 11…
  return local.length === 10 ? '549' + local : d;
}
