import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { createProduct, listAdminProducts } from '@/lib/data';

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
  const price = Number(body?.price);
  if (!name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: 'Faltan datos: nombre y precio válido' },
      { status: 400 }
    );
  }

  const created = await createProduct({
    name,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    price: Math.round(price),
    category_id: body.category_id ? Number(body.category_id) : null,
    visible: body.visible !== false,
  });
  return NextResponse.json(created, { status: 201 });
}
