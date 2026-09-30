import path from 'node:path';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import { thumbName } from '@/lib/catalog';

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const EXTS = ['webp', 'jpg', 'png', 'avif'] as const;

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB (el archivo que llega, antes de procesar)
export const PHOTO_MAX_PX = 1200; // lado mayor de la foto guardada
export const THUMB_MAX_PX = 600; // lado mayor de la miniatura (grilla del catálogo)

// Nombres que genera la app: uuid + extensión admitida. Nunca rutas.
const SAFE_FILENAME = /^[\w-]+\.(jpg|png|webp|avif)$/;

export function isSafeFilename(filename: string): boolean {
  return SAFE_FILENAME.test(filename);
}

export function mimeForFilename(filename: string): string | null {
  if (!isSafeFilename(filename)) return null;
  return MIME_BY_EXT[path.extname(filename)] ?? null;
}

// Tipo real de la imagen según sus primeros bytes. No se confía en el tipo que
// declara el navegador: así no se puede subir otra cosa disfrazada de foto.
export function detectImageExt(buf: Uint8Array): string | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...buf.subarray(start, end));

  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return '.jpg';
  if (buf.length >= 8 && ascii(0, 8) === '\x89PNG\r\n\x1a\n') return '.png';
  if (buf.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP')
    return '.webp';

  // AVIF: caja "ftyp" con la marca avif/avis como principal o compatible
  if (buf.length >= 12 && ascii(4, 8) === 'ftyp') {
    const boxSize = ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0;
    const end = Math.min(buf.length, boxSize, 256);
    const brands = [ascii(8, 12)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(i, i + 4));
    if (brands.some((b) => b === 'avif' || b === 'avis')) return '.avif';
  }
  return null;
}

// Normaliza la foto: aplica la rotación EXIF, acota el lado mayor, pasa a WebP
// y descarta los metadatos (incluida la ubicación GPS que traen las fotos de
// celular). Devuelve también la miniatura para la grilla.
export async function processPhoto(input: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  const make = (maxPx: number, quality: number) =>
    sharp(input)
      .rotate()
      .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  const [full, thumb] = await Promise.all([make(PHOTO_MAX_PX, 82), make(THUMB_MAX_PX, 78)]);
  return { full, thumb };
}

export async function savePhoto(file: File): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new Error('La foto supera los 8 MB');
  const buf = Buffer.from(await file.arrayBuffer());
  if (!detectImageExt(buf)) throw new Error('Formato no admitido (usar JPG, PNG, WebP o AVIF)');

  let processed: { full: Buffer; thumb: Buffer };
  try {
    processed = await processPhoto(buf);
  } catch {
    throw new Error('No se pudo procesar la imagen (¿archivo dañado?)');
  }

  const filename = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(UPLOAD_DIR, filename), processed.full),
    fs.writeFile(path.join(UPLOAD_DIR, thumbName(filename)), processed.thumb),
  ]);
  return filename;
}

export async function removePhotoFile(filename: string): Promise<void> {
  if (!isSafeFilename(filename)) return;
  await Promise.all(
    [filename, thumbName(filename)].map((f) =>
      fs.unlink(path.join(UPLOAD_DIR, f)).catch(() => {})
    )
  );
}

// Resuelve un nombre pedido por URL a un archivo real. Acepta la foto
// (uuid.ext) y su miniatura (uuid.t.webp); si la miniatura no existe (fotos
// subidas antes de esta versión) sirve la foto original en su lugar.
export async function readUpload(name: string): Promise<{ data: Buffer; mime: string } | null> {
  const m = /^([\w-]+)(\.t)?\.(jpg|png|webp|avif)$/.exec(name);
  if (!m) return null;
  const candidates = m[2] ? [name, ...EXTS.map((e) => `${m[1]}.${e}`)] : [name];
  for (const c of candidates) {
    try {
      const data = await fs.readFile(path.join(UPLOAD_DIR, c));
      return { data, mime: MIME_BY_EXT[path.extname(c)] };
    } catch {
      /* no está: probar el siguiente */
    }
  }
  return null;
}

// Foto original a partir de su nombre sin extensión (para /og/<nombre>.jpg)
export async function readUploadByBase(base: string): Promise<Buffer | null> {
  if (!/^[\w-]+$/.test(base)) return null;
  for (const e of EXTS) {
    try {
      return await fs.readFile(path.join(UPLOAD_DIR, `${base}.${e}`));
    } catch {
      /* siguiente extensión */
    }
  }
  return null;
}

// JPEG 1200×630 para la vista previa al compartir el link (WhatsApp, Instagram…).
// La foto entera sobre fondo blanco: no se recorta el producto.
export async function shareImage(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(1200, 630, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82 })
    .toBuffer();
}
