import { NextRequest, NextResponse } from 'next/server';
import { readUploadByBase, shareImage } from '@/lib/uploads';

// Imagen para la vista previa del link (og:image), generada a partir de una
// foto del catálogo. Se sirve en JPEG porque WhatsApp no muestra previews en
// WebP, que es como se guardan las fotos.

type Params = { params: Promise<{ name: string }> };

const notFound = () => new NextResponse('No existe', { status: 404 });

export async function GET(_req: NextRequest, { params }: Params) {
  const { name } = await params;
  const m = /^([\w-]+)\.jpg$/.exec(name);
  const source = m && (await readUploadByBase(m[1]));
  if (!source) return notFound();

  let jpg: Buffer;
  try {
    jpg = await shareImage(source);
  } catch {
    return notFound();
  }

  return new NextResponse(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpg.length),
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
