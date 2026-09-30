'use client';

import type { Settings } from '@/lib/data';
import { IconStore, IconTruck, IconWhatsApp } from '@/components/icons';

// Portada: bloque de color con el título, los botones y un collage de fotos
export function Hero({
  settings,
  stats,
  photos,
  waHref,
  onBrowse,
}: {
  settings: Settings;
  stats: string;
  photos: string[];
  waHref: string | null;
  onBrowse: () => void;
}) {
  return (
    <section className="hero">
      <div className="hero-in">
        <div className="hero-copy">
          <span className="eyebrow">{stats}</span>
          <h1>{settings.tagline || settings.shop_name}</h1>
          {settings.footer_note && <p>{settings.footer_note}</p>}
          <div className="hero-cta">
            <button type="button" className="btn btn-primary" onClick={onBrowse}>
              Ver productos
            </button>
            {waHref && (
              <a className="btn btn-light" href={waHref} target="_blank" rel="noopener">
                <IconWhatsApp /> Pedir por WhatsApp
              </a>
            )}
          </div>
        </div>
        {photos.length > 0 && (
          // Decorativo: los mismos productos están en la grilla con su nombre
          <div className={`hero-pics n${photos.length}`} aria-hidden="true">
            {photos.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Textos fijos: si cambian las condiciones del negocio, se editan acá
const PERKS = [
  { icon: <IconTruck />, title: 'Envío en el día', text: 'Coordinamos la entrega por WhatsApp' },
  { icon: <IconStore />, title: 'Retiro en el local', text: 'Pasá a buscar tu pedido' },
  { icon: <IconWhatsApp />, title: 'Pedido por WhatsApp', text: 'Armás la lista y la enviás en un toque' },
];

export function Perks() {
  return (
    <section className="perks" aria-label="Cómo comprar">
      <ul>
        {PERKS.map((p) => (
          <li key={p.title}>
            <span className="perk-ic">{p.icon}</span>
            <span>
              <strong>{p.title}</strong>
              <small>{p.text}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
