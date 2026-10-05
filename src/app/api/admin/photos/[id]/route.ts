import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { deletePhoto } from '@/lib/data';
import { removePhotoFile } from '@/lib/uploads';
import { parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  const filename = await deletePhoto(id);
  if (filename) await removePhotoFile(filename);
  return NextResponse.json({ ok: true });
}
