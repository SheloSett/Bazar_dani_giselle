import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { deleteProduct, getAdminProduct, updateProduct } from '@/lib/data';
import { removePhotoFile } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const product = await getAdminProduct(Number(id));
  if (!product)
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const input: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) input.name = body.name.trim();
  if (typeof body.description === 'string') input.description = body.description.trim();
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0)
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    input.price = Math.round(price);
  }
  if (body.category_id !== undefined)
    input.category_id = body.category_id ? Number(body.category_id) : null;
  if (typeof body.visible === 'boolean') input.visible = body.visible;

  await updateProduct(Number(id), input);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const filenames = await deleteProduct(Number(id));
  await Promise.all(filenames.map(removePhotoFile));
  return NextResponse.json({ ok: true });
}
