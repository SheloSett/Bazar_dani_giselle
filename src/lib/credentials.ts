// Clave vigente del admin y sesiones firmadas con ella.
//
// La clave vive en uno de dos lugares:
//   - la base (hash en settings), si se cambió alguna vez desde el panel;
//   - el .env (ADMIN_PASSWORD), la clave inicial, mientras nunca se haya cambiado.
// scripts/reset-password.mjs borra la de la base para volver a la del .env.

import { query } from '@/lib/db';
import { createToken, verifyToken } from '@/lib/auth';
import { samePlainPassword, verifyPasswordHash, hashPassword } from '@/lib/password';

const HASH_KEY = 'admin_password_hash';

export type Credential =
  | { kind: 'db'; hash: string }
  | { kind: 'env'; password: string };

export async function getCredential(): Promise<Credential | null> {
  const rows = await query<{ value: string }>(
    'SELECT value FROM settings WHERE key = $1',
    [HASH_KEY]
  );
  if (rows[0]?.value) return { kind: 'db', hash: rows[0].value };
  const password = process.env.ADMIN_PASSWORD;
  return password ? { kind: 'env', password } : null;
}

export function checkPassword(cred: Credential, given: string): Promise<boolean> | boolean {
  return cred.kind === 'db'
    ? verifyPasswordHash(given, cred.hash)
    : samePlainPassword(given, cred.password);
}

export async function verifyPassword(given: string): Promise<boolean> {
  const cred = await getCredential();
  return !!cred && (await checkPassword(cred, given));
}

// Entra en la clave con la que se firman las sesiones: al cambiar la clave del
// admin cambia también esto, y todas las sesiones abiertas dejan de valer.
export function credentialFingerprint(cred: Credential): string {
  return cred.kind === 'db' ? cred.hash : cred.password;
}

export async function isPasswordFromEnv(): Promise<boolean> {
  return (await getCredential())?.kind === 'env';
}

export async function setPassword(password: string): Promise<void> {
  await query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [HASH_KEY, await hashPassword(password)]
  );
}

// ---------- sesiones ----------

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const cred = await getCredential();
  return !!cred && verifyToken(token, credentialFingerprint(cred));
}

export async function newSessionToken(): Promise<string> {
  const cred = await getCredential();
  if (!cred) throw new Error('Falta configurar ADMIN_PASSWORD en el servidor');
  return createToken(credentialFingerprint(cred));
}
