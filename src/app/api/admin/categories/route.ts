import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { createCategory, listCategories } from '@/lib/data';
import { CATEGORY_NAME_MAX, parseCategoryName } from '@/lib/validate';

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await listCategories());
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = parseCategoryName(body?.name);
  if (!name)
    return NextResponse.json(
      { error: `Falta el nombre (máximo ${CATEGORY_NAME_MAX} caracteres)` },
      { status: 400 }
    );
  // Si ya existe una con ese nombre, devuelve esa
  return NextResponse.json(await createCategory(name), { status: 201 });
}
