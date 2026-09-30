import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { addPhoto, getAdminProduct, listProductPhotos } from '@/lib/data';
import { savePhoto } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const productId = Number(id);

  if (!(await getAdminProduct(productId)))
    return NextResponse.json({ error: 'El producto no existe' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });

  const files = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (!files.length)
    return NextResponse.json({ error: 'No llegó ninguna foto' }, { status: 400 });

  const errors: string[] = [];
  for (const file of files) {
    try {
      const filename = await savePhoto(file);
      await addPhoto(productId, filename);
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  const photos = await listProductPhotos(productId);
  return NextResponse.json({ photos, errors });
}
