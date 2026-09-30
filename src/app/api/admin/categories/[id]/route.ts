import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { deleteCategory } from '@/lib/data';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  // Los productos de la categoría quedan "sin categoría" (FK ON DELETE SET NULL)
  await deleteCategory(Number(id));
  return NextResponse.json({ ok: true });
}
