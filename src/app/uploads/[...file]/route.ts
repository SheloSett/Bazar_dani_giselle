import { NextRequest, NextResponse } from 'next/server';
import { readUpload } from '@/lib/uploads';

// Sirve las fotos subidas (y sus miniaturas) desde UPLOAD_DIR. No se usa
// public/ porque en el build standalone solo incluye lo que existía al compilar.

type Params = { params: Promise<{ file: string[] }> };

const notFound = () => new NextResponse('No existe', { status: 404 });

export async function GET(_req: NextRequest, { params }: Params) {
  const { file } = await params;
  // Un solo segmento con un nombre generado por la app: nada de subcarpetas ni ".."
  if (file.length !== 1) return notFound();
  const found = await readUpload(file[0]);
  if (!found) return notFound();

  return new NextResponse(new Uint8Array(found.data), {
    headers: {
      'Content-Type': found.mime,
      'Content-Length': String(found.data.length),
      // Los nombres son uuid y nunca se reutilizan: se puede cachear para siempre
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
