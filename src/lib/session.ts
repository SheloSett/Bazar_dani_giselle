// Helper para verificar la sesión del admin dentro de route handlers (Node)
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyToken } from '@/lib/auth';

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
