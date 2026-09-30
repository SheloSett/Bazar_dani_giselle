import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { getSettings, updateSettings, SETTING_KEYS, Settings } from '@/lib/data';

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

  const entries: Partial<Settings> = {};
  for (const key of SETTING_KEYS) {
    if (typeof body[key] === 'string') entries[key] = body[key];
  }
  await updateSettings(entries);
  return NextResponse.json(await getSettings());
}
