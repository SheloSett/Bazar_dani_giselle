import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite } from '@/lib/session';
import { deletePromo, setPromoActive, updatePromo } from '@/lib/promos-data';
import { isUniqueViolation } from '@/lib/db';
import { parseId, parsePromoInput } from '@/lib/validate';

type Params = { params: Promise<{ id: string }> };

// Editar una promoción: el formulario completo, o solo { active } para pausarla
// o reactivarla desde la lista
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (body && Object.keys(body).length === 1 && typeof body.active === 'boolean') {
    const promo = await setPromoActive(id, body.active);
    if (!promo) return NextResponse.json({ error: 'No existe' }, { status: 404 });
    return NextResponse.json(promo);
  }

  const parsed = parsePromoInput(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const promo = await updatePromo(id, parsed.value);
    if (!promo) return NextResponse.json({ error: 'No existe' }, { status: 404 });
    return NextResponse.json(promo);
  } catch (err) {
    if (isUniqueViolation(err))
      return NextResponse.json({ error: 'Ya hay un cupón con ese código.' }, { status: 409 });
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id || !(await deletePromo(id)))
    return NextResponse.json({ error: 'No existe' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
