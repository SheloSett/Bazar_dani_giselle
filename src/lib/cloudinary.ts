// Fotos en Cloudinary. Se activa con la variable CLOUDINARY_URL (la que muestra el
// panel de Cloudinary: cloudinary://<api_key>:<api_secret>@<cloud_name>); sin ella,
// las fotos siguen en el disco del servidor (ver lib/uploads.ts).
//
// Se habla con la API REST directo, sin el SDK: subir, borrar y bajar. Las fotos se
// suben ya procesadas por la app (WebP de 1200 px y miniatura de 600 px), así que
// Cloudinary solo las guarda y las sirve desde su CDN; no se usan transformaciones.

import { createHash } from 'node:crypto';

export interface CloudinaryConfig {
  cloud: string;
  key: string;
  secret: string;
  // carpeta dentro de la cuenta (CLOUDINARY_FOLDER, por defecto "bazar")
  folder: string;
  // bases de la API y de entrega; se pueden cambiar solo para pruebas
  apiBase: string;
  deliveryBase: string;
}

export function parseCloudinaryUrl(
  url: string | undefined,
  env: Record<string, string | undefined> = process.env
): CloudinaryConfig | null {
  if (!url) return null;
  const m = /^cloudinary:\/\/([^:@\s]+):([^@\s]+)@([\w-]+)\/?$/.exec(url.trim());
  if (!m) return null;
  const cloud = m[3];
  return {
    key: m[1],
    secret: m[2],
    cloud,
    folder: (env.CLOUDINARY_FOLDER || 'bazar').trim().replace(/^\/+|\/+$/g, '') || 'bazar',
    apiBase: (env.CLOUDINARY_API_BASE || `https://api.cloudinary.com/v1_1/${cloud}`).replace(/\/+$/, ''),
    deliveryBase: (env.CLOUDINARY_DELIVERY_BASE || `https://res.cloudinary.com/${cloud}`).replace(/\/+$/, ''),
  };
}

let cached: CloudinaryConfig | null | undefined;
export function cloudinaryConfig(): CloudinaryConfig | null {
  if (cached === undefined) cached = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  return cached;
}

// Nombre de archivo de la app → id en Cloudinary. "uuid.webp" → "bazar/uuid";
// la miniatura "uuid.t.webp" → "bazar/uuid-t" (un punto en el id confunde a Cloudinary).
export function publicIdFor(filename: string, folder: string): string | null {
  const m = /^([\w-]+?)(\.t)?\.(jpg|png|webp|avif)$/.exec(filename);
  if (!m) return null;
  return `${folder}/${m[1]}${m[2] ? '-t' : ''}`;
}

// URL pública de una foto en el CDN de Cloudinary, o null si el nombre no es válido
export function deliveryUrl(cfg: CloudinaryConfig, filename: string): string | null {
  const id = publicIdFor(filename, cfg.folder);
  if (!id) return null;
  const ext = filename.slice(filename.lastIndexOf('.') + 1);
  return `${cfg.deliveryBase}/image/upload/${id}.${ext}`;
}

// Firma de la API: SHA-1 de los parámetros ordenados ("a=1&b=2") seguidos del secreto
export function signParams(params: Record<string, string>, secret: string): string {
  const s = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1')
    .update(s + secret)
    .digest('hex');
}

function signedForm(cfg: CloudinaryConfig, params: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append('api_key', cfg.key);
  form.append('signature', signParams(params, cfg.secret));
  return form;
}

const now = () => String(Math.floor(Date.now() / 1000));

// Sube una foto ya procesada. Devuelve sus medidas.
export async function uploadToCloudinary(
  cfg: CloudinaryConfig,
  filename: string,
  data: Uint8Array
): Promise<{ width: number; height: number }> {
  const public_id = publicIdFor(filename, cfg.folder);
  if (!public_id) throw new Error('Nombre de archivo inválido');
  const form = signedForm(cfg, { public_id, timestamp: now(), overwrite: 'true' });
  // (el cast: a TypeScript no le alcanza con un Buffer para armar un Blob)
  form.append('file', new Blob([data as BlobPart]), filename);
  const res = await fetch(`${cfg.apiBase}/image/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json().catch(() => null)) as
    | { width?: number; height?: number; error?: { message?: string } }
    | null;
  if (!res.ok || !json || typeof json.width !== 'number' || typeof json.height !== 'number')
    throw new Error(`Cloudinary no aceptó la foto: ${json?.error?.message ?? `HTTP ${res.status}`}`);
  return { width: json.width, height: json.height };
}

// Borra una foto (y de paso su copia en el CDN). Si falla, no frena nada.
export async function destroyInCloudinary(cfg: CloudinaryConfig, filename: string): Promise<void> {
  const public_id = publicIdFor(filename, cfg.folder);
  if (!public_id) return;
  const form = signedForm(cfg, { public_id, timestamp: now(), invalidate: 'true' });
  await fetch(`${cfg.apiBase}/image/destroy`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {});
}

// Últimas fotos bajadas, para no pedirle a Cloudinary lo mismo a cada rato (los
// nombres nunca se reutilizan, así que lo guardado no caduca). Tope en cantidad.
const fetched = new Map<string, Buffer>();
const FETCHED_MAX = 40;

// Baja una foto (para armar la vista previa del link y el ícono de la pestaña)
export async function fetchFromCloudinary(
  cfg: CloudinaryConfig,
  filename: string
): Promise<Buffer | null> {
  const url = deliveryUrl(cfg, filename);
  if (!url) return null;
  const hit = fetched.get(url);
  if (hit) return hit;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!res || !res.ok) return null;
  const data = Buffer.from(await res.arrayBuffer());
  if (fetched.size >= FETCHED_MAX) fetched.delete(fetched.keys().next().value as string);
  fetched.set(url, data);
  return data;
}
