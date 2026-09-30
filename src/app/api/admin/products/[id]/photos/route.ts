import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import {
  addPhoto,
  getAdminProduct,
  listProductPhotos,
  reorderPhotos,
} from '@/lib/data';
import { savePhoto } from '@/lib/uploads';
import { parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const productId = parseId((await params).id);

  if (!productId || !(await getAdminProduct(productId)))
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

// Nuevo orden de las fotos: { order: [ids…] }, la primera es la portada
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const productId = parseId((await params).id);
  if (!productId) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const order: (number | null)[] | null = Array.isArray(body?.order)
    ? body.order.map(parseId)
    : null;
  if (!order || order.some((id) => id === null))
    return NextResponse.json({ error: 'Orden inválido' }, { status: 400 });

  if (!(await reorderPhotos(productId, order as number[])))
    return NextResponse.json(
      { error: 'El orden no coincide con las fotos del producto' },
      { status: 400 }
    );

  return NextResponse.json({ photos: await listProductPhotos(productId) });
}
