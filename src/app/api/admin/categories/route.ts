import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite, isAdmin } from '@/lib/session';
import { createCategory, listCategories, reorderCategories } from '@/lib/data';
import { CATEGORY_NAME_MAX, parseCategoryName, parseIdList } from '@/lib/validate';

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await listCategories());
}

export async function POST(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
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

// Nuevo orden de los rubros: { order: [ids…] }, como se ven en el catálogo
export async function PATCH(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const order = parseIdList(body?.order);
  if (!order) return NextResponse.json({ error: 'Orden inválido' }, { status: 400 });

  if (!(await reorderCategories(order)))
    return NextResponse.json(
      { error: 'El orden no coincide con las categorías' },
      { status: 400 }
    );

  return NextResponse.json(await listCategories());
}
