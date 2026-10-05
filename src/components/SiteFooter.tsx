'use client';

import Link from 'next/link';
import type { Settings } from '@/lib/data';
import { IconInstagram, IconWhatsApp } from '@/components/icons';

// Créditos del desarrollador en el pie, como en los otros sitios (Shiraf,
// IGWT Store, Manhattan). El mail va en minúscula; Gmail ignora las mayúsculas.
const DEV_CREDIT = {
  name: 'SheloSettDev',
  instagramUrl: 'https://instagram.com/shelosettdev',
  email: 'shelosettdev@gmail.com',
  whatsapp: '5491136557290', // solo dígitos con código de país, formato wa.me
} as const;

export function SiteFooter({
  settings,
  categories,
  waHref,
  withBar,
  onPick,
}: {
  settings: Settings;
  categories: string[];
  waHref: string | null;
  withBar: boolean; // la barra de pedido flota abajo: dejarle lugar
  onPick: (name: string) => void;
}) {
  return (
    <footer className={withBar ? 'site-footer with-bar' : 'site-footer'}>
      <div className="foot-in">
        <div className="foot-brand">
          <span className="brand">{settings.shop_name}</span>
          {settings.tagline && <p>{settings.tagline}</p>}
        </div>
        {categories.length > 0 && (
          <nav className="foot-col" aria-label="Rubros">
            <h3>Rubros</h3>
            <ul>
              {categories.map((c) => (
                <li key={c}>
                  <button type="button" onClick={() => onPick(c)}>
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="foot-col">
          <h3>Pedidos</h3>
          <p>Elegí los productos, armá tu pedido y envialo por WhatsApp. Te confirmamos precio y entrega.</p>
          {waHref && (
            <a className="btn btn-foot" href={waHref} target="_blank" rel="noopener">
              <IconWhatsApp /> Escribinos
            </a>
          )}
        </div>
      </div>
      {/* antes era un <p className="foot-bottom"> con solo el ©: pasa a <div>
          para sumarle la línea de créditos del desarrollador */}
      <div className="foot-bottom">
        <p className="foot-legal">
          <Link href="/terminos">Términos y condiciones</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacidad">Política de privacidad</Link>
        </p>
        <p>
          © {new Date().getFullYear()} {settings.shop_name}
        </p>
        <p className="foot-credit">
          <span>Desarrollado por</span>
          <a href={DEV_CREDIT.instagramUrl} target="_blank" rel="noopener">
            <IconInstagram /> {DEV_CREDIT.name}
          </a>
          <span aria-hidden="true">·</span>
          <a href={`mailto:${DEV_CREDIT.email}`}>{DEV_CREDIT.email}</a>
          <span aria-hidden="true">·</span>
          <a href={`https://wa.me/${DEV_CREDIT.whatsapp}`} target="_blank" rel="noopener">
            <IconWhatsApp /> WhatsApp
          </a>
        </p>
      </div>
    </footer>
  );
}

// Botón fijo para consultar por WhatsApp desde cualquier parte de la página
export function WhatsAppFab({ href, raised }: { href: string; raised: boolean }) {
  return (
    <a
      className={raised ? 'wa-fab raised' : 'wa-fab'}
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Escribinos por WhatsApp"
    >
      <IconWhatsApp />
    </a>
  );
}
