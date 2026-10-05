// Límite de intentos fallidos de login, en memoria (la app corre en un solo
// proceso). Cuenta por IP y además en total: la IP sale de X-Forwarded-For,
// que sin un proxy delante (Caddy) el cliente puede falsear, y el tope global
// frena la fuerza bruta igual aunque vaya rotando IPs falsas.

export interface LimiterOptions {
  windowMs: number;
  maxPerIp: number;
  maxGlobal: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createLoginLimiter(
  opts: LimiterOptions,
  now: () => number = Date.now
) {
  const byIp = new Map<string, Bucket>();
  let global: Bucket = { count: 0, resetAt: 0 };

  const active = (b: Bucket | undefined) => !!b && b.resetAt > now();

  const bump = (b: Bucket | undefined): Bucket =>
    active(b)
      ? { count: b!.count + 1, resetAt: b!.resetAt }
      : { count: 1, resetAt: now() + opts.windowMs };

  return {
    // Segundos que hay que esperar antes de intentar de nuevo (0 = puede intentar)
    retryAfter(ip: string): number {
      const t = now();
      const ipBucket = byIp.get(ip);
      let until = 0;
      if (active(ipBucket) && ipBucket!.count >= opts.maxPerIp) until = ipBucket!.resetAt;
      if (active(global) && global.count >= opts.maxGlobal)
        until = Math.max(until, global.resetAt);
      return until ? Math.ceil((until - t) / 1000) : 0;
    },

    fail(ip: string): void {
      // Limpia lo vencido para que el mapa no crezca sin control
      for (const [k, b] of byIp) if (!active(b)) byIp.delete(k);
      byIp.set(ip, bump(byIp.get(ip)));
      global = bump(global);
    },

    succeed(ip: string): void {
      byIp.delete(ip);
    },
  };
}

const globalForLimiter = globalThis as unknown as {
  loginLimiter?: ReturnType<typeof createLoginLimiter>;
  passwordLimiter?: ReturnType<typeof createLoginLimiter>;
  orderLimiter?: ReturnType<typeof createLoginLimiter>;
};

// "Cambiar clave" pide la clave actual: con una sesión robada no tiene que servir
// para adivinarla. Mismos topes que el login, contados aparte.
export const passwordLimiter = (globalForLimiter.passwordLimiter ??= createLoginLimiter({
  windowMs: 15 * 60 * 1000,
  maxPerIp: 5,
  maxGlobal: 30,
}));

// 5 fallos por IP y 30 en total cada 15 minutos
export const loginLimiter = (globalForLimiter.loginLimiter ??= createLoginLimiter({
  windowMs: 15 * 60 * 1000,
  maxPerIp: 5,
  maxGlobal: 30,
}));

// Pedidos guardados desde el catálogo (ruta pública): acá cada pedido cuenta como
// un evento ("fail"). 12 por IP y 240 en total cada 10 minutos, para que nadie
// llene la base de pedidos falsos.
export const orderLimiter = (globalForLimiter.orderLimiter ??= createLoginLimiter({
  windowMs: 10 * 60 * 1000,
  maxPerIp: 12,
  maxGlobal: 240,
}));

// El cuerpo declara su tamaño y entra en el tope. Se mira antes de leerlo: sin esto,
// una ruta que acepta JSON sin sesión se traga cuerpos de cualquier tamaño.
export function bodyWithin(headers: Headers, maxBytes: number): boolean {
  const length = Number(headers.get('content-length'));
  return Number.isFinite(length) && length > 0 && length <= maxBytes;
}

// IP de quien hace el pedido. Sin proxy delante, Next la toma de la conexión;
// con proxy (Caddy) llega en X-Forwarded-For.
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'desconocida'
  );
}
