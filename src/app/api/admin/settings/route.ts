import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { getSettings, updateSettings, SETTING_KEYS, type TextSettings } from '@/lib/data';
import { parsePhone } from '@/lib/validate';

// Largo máximo de cada texto: son los que entran bien donde se muestran
const MAX_LENGTH: Record<keyof TextSettings, number> = {
  shop_name: 80,
  whatsapp_phone: 40,
  tagline: 120,
  footer_note: 300,
  perk1_title: 40,
  perk1_text: 90,
  perk2_title: 40,
  perk2_text: 90,
  perk3_title: 40,
  perk3_text: 90,
};

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await getSettings());
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const fail = (error: string) => NextResponse.json({ error }, { status: 400 });

  const entries: Partial<TextSettings> = {};
  for (const key of SETTING_KEYS) {
    if (typeof body[key] !== 'string') continue;
    const value = body[key].trim();
    if (value.length > MAX_LENGTH[key])
      return fail(`Hay un texto demasiado largo (máximo ${MAX_LENGTH[key]} caracteres).`);
    entries[key] = value;
  }

  if (entries.shop_name !== undefined && !entries.shop_name)
    return fail('Falta el nombre del negocio.');

  // El WhatsApp se valida acá y no solo en el navegador: con un número mal cargado
  // fallan todos los botones de WhatsApp del catálogo. Se guarda solo con dígitos.
  if (entries.whatsapp_phone !== undefined) {
    const digits = parsePhone(entries.whatsapp_phone);
    if (!digits)
      return fail(
        'El WhatsApp no es válido. Tiene que ir con código de país, por ejemplo 5491122334455.'
      );
    entries.whatsapp_phone = digits;
  }

  await updateSettings(entries);
  return NextResponse.json(await getSettings());
}
