import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { createProduct, listAdminProducts, reorderProducts } from '@/lib/data';
import { isForeignKeyViolation } from '@/lib/db';
import {
  parseId,
  parseIdList,
  parseOptionalPrice,
  parsePrice,
  parseStock,
} from '@/lib/validate';

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await listAdminProducts());
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const price = parsePrice(body?.price);
  if (!name || price === null) {
    return NextResponse.json(
      { error: 'Faltan datos: nombre y precio válido' },
      { status: 400 }
    );
  }

  const compare = parseOptionalPrice(body.compare_price);
  if (!compare)
    return NextResponse.json({ error: 'Precio anterior inválido' }, { status: 400 });
  if (compare.value !== null && compare.value <= price)
    return NextResponse.json(
      { error: 'El precio anterior tiene que ser mayor que el precio actual' },
      { status: 400 }
    );

  const stock = parseStock(body.stock);
  if (!stock) return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });

  const categoryId = body.category_id ? parseId(body.category_id) : null;
  if (body.category_id && categoryId === null)
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });

  try {
    const created = await createProduct({
      name,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      price,
      compare_price: compare.value,
      stock: stock.value,
      category_id: categoryId,
      visible: body.visible !== false,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (isForeignKeyViolation(err))
      return NextResponse.json({ error: 'La categoría no existe' }, { status: 400 });
    throw err;
  }
}

// Nuevo orden de los productos de un rubro: { order: [ids…] }. Tienen que ser
// exactamente todos los productos de un mismo rubro (o todos los sin rubro).
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const order = parseIdList(body?.order);
  if (!order) return NextResponse.json({ error: 'Orden inválido' }, { status: 400 });

  if (!(await reorderProducts(order)))
    return NextResponse.json(
      { error: 'El orden no coincide con los productos del rubro' },
      { status: 400 }
    );

  return NextResponse.json({ ok: true });
}
