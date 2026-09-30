'use client';

import type { Settings } from '@/lib/data';
import { IconWhatsApp } from '@/components/icons';

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
      <p className="foot-bottom">
        © {new Date().getFullYear()} {settings.shop_name}
      </p>
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
