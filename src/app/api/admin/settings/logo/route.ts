import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { setLogo } from '@/lib/data';
import { logoNeedsName, photoSize, removePhotoFile, savePhoto } from '@/lib/uploads';

// Logo del negocio: se muestra en el encabezado del catálogo y como ícono de la
// pestaña. Pasa por el mismo procesado que las fotos. Uno apaisado reemplaza al
// nombre; uno cuadrado o redondo va con el nombre al lado (a ese tamaño no se lee).

export async function POST(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  const file = form?.get('logo');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'No llegó ninguna imagen' }, { status: 400 });

  let filename: string;
  try {
    filename = await savePhoto(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo guardar el logo';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const size = await photoSize(filename);
  const old = await setLogo(filename, size ? logoNeedsName(size.width, size.height) : true);
  if (old) await removePhotoFile(old);
  return NextResponse.json({ logo: filename });
}

// Quitar el logo: el catálogo vuelve a mostrar el nombre como texto
export async function DELETE(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const old = await setLogo(null);
  if (old) await removePhotoFile(old);
  return NextResponse.json({ logo: null });
}
