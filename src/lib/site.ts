import { headers } from 'next/headers';

// URL pública del sitio, para los links absolutos de las vistas previas al
// compartir. Con SITE_URL configurada se usa esa; si no, se deduce del pedido
// (host y protocolo que mandan el navegador o el proxy).
export async function siteBaseUrl(): Promise<URL> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      /* mal escrita: se deduce del pedido */
    }
  }
  const h = await headers();
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() || 'http';
  const host =
    h.get('x-forwarded-host')?.split(',')[0].trim() || h.get('host') || 'localhost:3000';
  return new URL(`${proto}://${host}`);
}
