import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { deleteCategory } from '@/lib/data';
import { parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  // Los productos de la categoría quedan "sin categoría" (FK ON DELETE SET NULL)
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
}
