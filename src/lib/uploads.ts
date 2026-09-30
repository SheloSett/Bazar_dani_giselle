import path from 'node:path';
import { promises as fs } from 'node:fs';

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

export function extForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

export async function savePhoto(file: File): Promise<string> {
  const ext = extForMime(file.type);
  if (!ext) throw new Error('Formato no admitido (usar JPG, PNG, WebP o AVIF)');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('La foto supera los 8 MB');
  const filename = crypto.randomUUID() + ext;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buf);
  return filename;
}

export async function removePhotoFile(filename: string): Promise<void> {
  // Solo nombres simples generados por la app; nunca rutas
  if (!/^[\w.-]+$/.test(filename)) return;
  await fs.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
}
