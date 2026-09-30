import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { createCategory, listCategories } from '@/lib/data';

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await listCategories());
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name)
    return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 });
  return NextResponse.json(await createCategory(name), { status: 201 });
}
