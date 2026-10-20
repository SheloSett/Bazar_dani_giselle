import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { deleteBanner, listBanners } from '@/lib/data';
import { removePhotoFile } from '@/lib/uploads';
import { parseId } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// Quitar un banner del carrusel (y su archivo)
export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  const filename = await deleteBanner(id);
  if (filename) await removePhotoFile(filename);
  return NextResponse.json({ banners: await listBanners() });
}
