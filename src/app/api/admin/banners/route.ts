import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { addBanner, listBanners, MAX_BANNERS, reorderBanners } from '@/lib/data';
import { BANNER_MAX_PX, removePhotoFile, savePhoto } from '@/lib/uploads';
import { parseIdList } from '@/lib/validate';

// Fotos del carrusel de la portada (Ajustes → Banners). Se suben de a varias; las que
// no entran porque el carrusel ya está lleno vuelven como error.

export async function POST(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });

  const files = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (!files.length)
    return NextResponse.json({ error: 'No llegó ninguna foto' }, { status: 400 });

  const errors: string[] = [];
  for (const file of files) {
    try {
      const filename = await savePhoto(file, BANNER_MAX_PX);
      if (!(await addBanner(filename))) {
        await removePhotoFile(filename);
        errors.push(`${file.name}: ya hay ${MAX_BANNERS} banners, quitá alguno para sumar otro`);
      }
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }

  return NextResponse.json({ banners: await listBanners(), errors });
}

// Nuevo orden del carrusel: { order: [ids…] }
export async function PATCH(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const order = parseIdList(body?.order);
  if (!order) return NextResponse.json({ error: 'Orden inválido' }, { status: 400 });

  if (!(await reorderBanners(order)))
    return NextResponse.json(
      { error: 'El orden no coincide con los banners cargados' },
      { status: 400 }
    );

  return NextResponse.json({ banners: await listBanners() });
}
