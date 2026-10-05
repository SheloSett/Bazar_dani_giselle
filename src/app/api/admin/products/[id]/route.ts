import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite, isAdmin } from '@/lib/session';
import {
  deleteProduct,
  getAdminProduct,
  updateProduct,
  type ProductInput,
} from '@/lib/data';
import { isForeignKeyViolation } from '@/lib/db';
import { removePhotoFile } from '@/lib/uploads';
import { parseId, parseOptionalPrice, parsePrice, parseStock } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = parseId((await params).id);
  const product = id && (await getAdminProduct(id));
  if (!product)
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const input: Partial<ProductInput> = {};
  if (typeof body.name === 'string' && body.name.trim()) input.name = body.name.trim();
  if (typeof body.description === 'string') input.description = body.description.trim();
  if (body.price !== undefined) {
    const price = parsePrice(body.price);
    if (price === null)
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    input.price = price;
  }
  if (body.compare_price !== undefined) {
    const compare = parseOptionalPrice(body.compare_price);
    if (!compare)
      return NextResponse.json({ error: 'Precio anterior inválido' }, { status: 400 });
    input.compare_price = compare.value;
  }
  if (body.stock !== undefined) {
    const stock = parseStock(body.stock);
    if (!stock) return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });
    input.stock = stock.value;
  }
  if (body.category_id !== undefined) {
    const categoryId = body.category_id ? parseId(body.category_id) : null;
    if (body.category_id && categoryId === null)
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    input.category_id = categoryId;
  }
  if (typeof body.visible === 'boolean') input.visible = body.visible;

  // Oferta coherente: el precio anterior tiene que superar al actual, mirando
  // lo que cambia junto con lo que ya está guardado
  if (input.price !== undefined || input.compare_price !== undefined) {
    const existing = await getAdminProduct(id);
    if (!existing) return NextResponse.json({ error: 'No existe' }, { status: 404 });
    const price = input.price ?? existing.price;
    const compare =
      input.compare_price === undefined ? existing.compare_price : input.compare_price;
    if (compare !== null && compare <= price)
      return NextResponse.json(
        { error: 'El precio anterior tiene que ser mayor que el precio actual' },
        { status: 400 }
      );
  }

  try {
    await updateProduct(id, input);
  } catch (err) {
    if (isForeignKeyViolation(err))
      return NextResponse.json({ error: 'La categoría no existe' }, { status: 400 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  const filenames = await deleteProduct(id);
  await Promise.all(filenames.map(removePhotoFile));
  return NextResponse.json({ ok: true });
}
