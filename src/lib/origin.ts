// Un pedido que cambia algo en el panel tiene que salir del propio sitio. La cookie
// SameSite=Lax ya frena a otros sitios; esto cubre además a otras aplicaciones que
// compartan el dominio o la IP, que para el navegador son "el mismo sitio".
//
// Se controla en cada ruta (denyAdminWrite, en lib/session.ts) y no en el middleware:
// lo que pasa por el middleware de Next lleva su cuerpo copiado, y las fotos de más de
// 2 o 3 MB llegaban rotas a la ruta más o menos la mitad de las veces.
export function isCrossOrigin(headers: Headers): boolean {
  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return true;

  const origin = headers.get('origin');
  if (!origin) return false; // no viene de un navegador: no hay a quién engañar
  const host = headers.get('x-forwarded-host')?.split(',')[0].trim() || headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
