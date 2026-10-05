import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSettings } from '@/lib/data';
import { readUpload } from '@/lib/uploads';

// Ícono de la pestaña del navegador (y del acceso directo en el celular).
// Si hay logo cargado sale de ahí; si no, un ícono genérico con el verde del sitio.

const SIZE = 192;

// Canasta blanca sobre fondo verde. Solo trazos, sin texto: el servidor no
// tiene por qué tener fuentes instaladas.
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="5.5" fill="#0d6b45"/>
  <g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(2.4 2.4) scale(0.8)">
    <path d="M4.5 9h15l-1.4 10.5h-12L4.5 9z"/>
    <path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>
  </g>
</svg>`;

// El último ícono generado: se rehace solo cuando cambia el logo
let cached: { key: string; png: Buffer } | null = null;

async function buildIcon(logo: string | null): Promise<Buffer> {
  const source = logo ? (await readUpload(logo))?.data : null;
  if (source) {
    try {
      return await sharp(source)
        .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch {
      /* logo ilegible: cae al genérico */
    }
  }
  return sharp(Buffer.from(DEFAULT_SVG)).png().toBuffer();
}

export async function GET() {
  const { logo } = await getSettings();
  const key = logo ?? '';
  if (!cached || cached.key !== key) cached = { key, png: await buildIcon(logo) };

  return new NextResponse(new Uint8Array(cached.png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(cached.png.length),
      // Corto: si cambia el logo, el ícono se actualiza en un rato
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
