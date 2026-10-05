import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { deleteCategory, renameCategory } from '@/lib/data';
import { isUniqueViolation } from '@/lib/db';
import { removePhotoFile } from '@/lib/uploads';
import { CATEGORY_NAME_MAX, parseCategoryName, parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// Renombrar
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = parseCategoryName(body?.name);
  if (!name)
    return NextResponse.json(
      { error: `Falta el nombre (máximo ${CATEGORY_NAME_MAX} caracteres)` },
      { status: 400 }
    );

  try {
    const category = await renameCategory(id, name);
    if (!category) return NextResponse.json({ error: 'No existe' }, { status: 404 });
    return NextResponse.json(category);
  } catch (err) {
    if (isUniqueViolation(err))
      return NextResponse.json(
        { error: `Ya hay una categoría que se llama "${name}"` },
        { status: 409 }
      );
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  // Los productos de la categoría quedan "sin categoría" (FK ON DELETE SET NULL)
  const photo = await deleteCategory(id);
  if (photo) await removePhotoFile(photo);
  return NextResponse.json({ ok: true });
}
