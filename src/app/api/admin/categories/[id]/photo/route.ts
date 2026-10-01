import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { setCategoryPhoto } from '@/lib/data';
import { removePhotoFile, savePhoto } from '@/lib/uploads';
import { parseId } from '@/lib/validate';

// Foto propia del rubro en el catálogo (reemplaza a la del primer producto)

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('photo');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'No llegó ninguna foto' }, { status: 400 });

  let filename: string;
  try {
    filename = await savePhoto(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo guardar la foto';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = await setCategoryPhoto(id, filename);
  if (!result) {
    await removePhotoFile(filename);
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  }
  if (result.oldPhoto) await removePhotoFile(result.oldPhoto);
  return NextResponse.json(result.category);
}

// Quitar la foto propia: el rubro vuelve a usar la del primer producto
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const result = await setCategoryPhoto(id, null);
  if (!result) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  if (result.oldPhoto) await removePhotoFile(result.oldPhoto);
  return NextResponse.json(result.category);
}
