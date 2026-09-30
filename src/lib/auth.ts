// Sesión del admin: token "expiración.firma" firmado con HMAC-SHA256.
// La clave de firma combina SESSION_SECRET con una huella de la clave vigente
// del admin (ver credentials.ts): cambiar la clave invalida las sesiones.
// Usa Web Crypto y no toca la base, así se puede probar sin Postgres.

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= MIN_SECRET_LENGTH) return s;
  // En desarrollo se tolera no tenerlo; en producción nunca un secreto conocido
  return process.env.NODE_ENV === 'production'
    ? null
    : 'dev-secret-solo-para-desarrollo-local';
}

// Problema de configuración que impide firmar sesiones, o null si está todo bien
export function authConfigError(): string | null {
  if (!sessionSecret())
    return `Falta configurar SESSION_SECRET en el servidor (mínimo ${MIN_SECRET_LENGTH} caracteres)`;
  return null;
}

function signingKey(fingerprint: string): string | null {
  const secret = sessionSecret();
  return secret ? `${secret}\u0000${fingerprint}` : null;
}

async function hmacHex(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createToken(fingerprint: string): Promise<string> {
  const key = signingKey(fingerprint);
  if (!key) throw new Error(authConfigError() ?? 'Sesión mal configurada');
  const exp = String(Date.now() + SESSION_MAX_AGE_S * 1000);
  return `${exp}.${await hmacHex(key, exp)}`;
}

export async function verifyToken(
  token: string | undefined,
  fingerprint: string
): Promise<boolean> {
  const key = signingKey(fingerprint);
  if (!token || !key) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = await hmacHex(key, exp);
  if (sig.length !== expected.length) return false;
  // comparación en tiempo constante
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
