import { NextRequest, NextResponse } from 'next/server';
import { cloudPhotoUrl, readLocalUpload } from '@/lib/uploads';

// Sirve las fotos subidas (y sus miniaturas) desde UPLOAD_DIR. No se usa
// public/ porque en el build standalone solo incluye lo que existía al compilar.
// Con las fotos en Cloudinary, redirige al CDN de Cloudinary: el navegador las baja
// de ahí y el servidor no gasta ancho de banda en fotos.

type Params = { params: Promise<{ file: string[] }> };

const notFound = () => new NextResponse('No existe', { status: 404 });

export async function GET(_req: NextRequest, { params }: Params) {
  const { file } = await params;
  // Un solo segmento con un nombre generado por la app: nada de subcarpetas ni ".."
  if (file.length !== 1) return notFound();

  const found = await readLocalUpload(file[0]);
  if (found)
    return new NextResponse(new Uint8Array(found.data), {
      headers: {
        'Content-Type': found.mime,
        'Content-Length': String(found.data.length),
        // Los nombres son uuid y nunca se reutilizan: se puede cachear para siempre
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  const url = cloudPhotoUrl(file[0]);
  if (!url) return notFound();
  // La redirección se cachea un día: si algún día las fotos vuelven al disco, el
  // navegador deja de ir a Cloudinary solo
  return NextResponse.redirect(url, {
    status: 308,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
