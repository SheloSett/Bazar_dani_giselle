import { NextRequest, NextResponse } from 'next/server';
import { denyAdminWrite, isAdmin } from '@/lib/session';
import { createPromo, listPromos } from '@/lib/promos-data';
import { isUniqueViolation } from '@/lib/db';
import { parsePromoInput } from '@/lib/validate';

// Promociones y cupones del panel

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await listPromos());
}

export async function POST(req: NextRequest) {
  const denied = await denyAdminWrite(req);
  if (denied) return denied;

  const parsed = parsePromoInput(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    return NextResponse.json(await createPromo(parsed.value), { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err))
      return NextResponse.json({ error: 'Ya hay un cupón con ese código.' }, { status: 409 });
    throw err;
  }
}
