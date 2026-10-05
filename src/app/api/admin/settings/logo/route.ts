import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { setLogo } from '@/lib/data';
import { removePhotoFile, savePhoto } from '@/lib/uploads';

// Logo del negocio: se muestra en el encabezado del catálogo en lugar del nombre
// y como ícono de la pestaña. Pasa por el mismo procesado que las fotos.

export async function POST(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

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

  const old = await setLogo(filename);
  if (old) await removePhotoFile(old);
  return NextResponse.json({ logo: filename });
}

// Quitar el logo: el catálogo vuelve a mostrar el nombre como texto
export async function DELETE() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const old = await setLogo(null);
  if (old) await removePhotoFile(old);
  return NextResponse.json({ logo: null });
}
