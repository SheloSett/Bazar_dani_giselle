import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { deletePhoto } from '@/lib/data';
import { removePhotoFile } from '@/lib/uploads';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const filename = await deletePhoto(Number(id));
  if (filename) await removePhotoFile(filename);
  return NextResponse.json({ ok: true });
}
