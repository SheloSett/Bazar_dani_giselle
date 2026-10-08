// Sube a Cloudinary las fotos que ya están en el disco (UPLOAD_DIR), para pasar
// un sitio que venía guardándolas en el servidor. Se corre una vez, con
// CLOUDINARY_URL configurada:
//
//   docker compose exec app node scripts/fotos-a-cloudinary.mjs            (sube)
//   docker compose exec app node scripts/fotos-a-cloudinary.mjs --borrar   (sube y borra las copias locales)
//
// Se puede volver a correr: lo ya subido se sobreescribe igual. Las fotos viejas
// sin miniatura (JPG de antes de la optimización) reciben una miniatura nueva.
// Mientras una foto siga en el disco, el sitio la sirve de ahí; cuando no está,
// redirige a Cloudinary. Por eso --borrar es seguro recién después de subir todo.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const BORRAR = process.argv.includes('--borrar');

const m = /^cloudinary:\/\/([^:@\s]+):([^@\s]+)@([\w-]+)\/?$/.exec((process.env.CLOUDINARY_URL || '').trim());
if (!m) {
  console.error('Falta CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>)');
  process.exit(1);
}
const cfg = {
  key: m[1],
  secret: m[2],
  cloud: m[3],
  folder: (process.env.CLOUDINARY_FOLDER || 'bazar').replace(/^\/+|\/+$/g, '') || 'bazar',
  apiBase: (process.env.CLOUDINARY_API_BASE || `https://api.cloudinary.com/v1_1/${m[3]}`).replace(/\/+$/, ''),
};

const sign = (params) =>
  createHash('sha1')
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + cfg.secret)
    .digest('hex');

async function upload(filename, data) {
  const mm = /^([\w-]+?)(\.t)?\.(jpg|png|webp|avif)$/.exec(filename);
  if (!mm) throw new Error(`nombre raro: ${filename}`);
  const params = { public_id: `${cfg.folder}/${mm[1]}${mm[2] ? '-t' : ''}`, timestamp: String(Math.floor(Date.now() / 1000)), overwrite: 'true' };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append('api_key', cfg.key);
  form.append('signature', sign(params));
  form.append('file', new Blob([data]), filename);
  const res = await fetch(`${cfg.apiBase}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
}

const files = (await fs.readdir(DIR)).filter((f) => /^[\w-]+(\.t)?\.(jpg|png|webp|avif)$/.test(f));
const originals = files.filter((f) => !f.endsWith('.t.webp'));
const thumbs = new Set(files.filter((f) => f.endsWith('.t.webp')));
console.log(`[fotos] ${originals.length} fotos en ${DIR} → Cloudinary (${cfg.cloud}/${cfg.folder})`);

let ok = 0;
const subidos = [];
for (const name of originals) {
  const base = name.slice(0, name.lastIndexOf('.'));
  const thumb = `${base}.t.webp`;
  try {
    const data = await fs.readFile(path.join(DIR, name));
    await upload(name, data);
    let thumbData;
    if (thumbs.has(thumb)) thumbData = await fs.readFile(path.join(DIR, thumb));
    else thumbData = await sharp(data).rotate().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    await upload(thumb, thumbData);
    ok++;
    subidos.push(name, ...(thumbs.has(thumb) ? [thumb] : []));
    console.log(`[fotos] ok ${name}${thumbs.has(thumb) ? '' : ' (miniatura generada)'}`);
  } catch (err) {
    console.error(`[fotos] FALLÓ ${name}: ${err.message}`);
  }
}
console.log(`[fotos] subidas ${ok} de ${originals.length}`);

if (BORRAR && ok === originals.length) {
  for (const f of subidos) await fs.unlink(path.join(DIR, f)).catch(() => {});
  console.log(`[fotos] copias locales borradas: ${subidos.length} archivos`);
} else if (BORRAR) {
  console.log('[fotos] no se borró nada: alguna subida falló');
}
