// Hash y verificación de la clave del admin con scrypt (node:crypto).
// La clave nunca se guarda en texto plano.

import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

// Parámetros de scrypt. Van dentro del hash, así se pueden subir más adelante
// sin invalidar las claves ya guardadas.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

// Formato guardado: scrypt$N$r$p$salt_hex$hash_hex
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('hex'), key.toString('hex')].join('$');
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  if (!expected.length) return false;
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(key, expected);
}

// Compara dos claves en texto plano (la inicial del .env) en tiempo constante.
// Se comparan hashes para no filtrar el largo de la clave.
export function samePlainPassword(a: string, b: string): boolean {
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(a), h(b));
}
