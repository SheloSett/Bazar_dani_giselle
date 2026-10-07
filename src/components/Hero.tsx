'use client';

import type { PublicProduct, Settings } from '@/lib/data';
import { thumbUrl } from '@/lib/catalog';
import { isPromoLive, promoSummary, type PublicPromo } from '@/lib/promos';
import { IconStore, IconTag, IconTruck, IconWhatsApp } from '@/components/icons';
import { FitPhoto } from '@/components/FitPhoto';

// Portada: bloque de color con el logo en grande (pedido del cliente: el del
// encabezado queda chico), el título, los botones y un collage de fotos
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
          {settings.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hero-logo" src={thumbUrl(settings.logo)} alt={settings.shop_name} />
          )}
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
              <FitPhoto key={src} src={src} alt="" fit="cover" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Los tres beneficios se editan en el panel (Ajustes). El ícono de cada lugar es fijo;
// el que queda sin título no se muestra, y sin ninguno desaparece la franja entera.
export function Perks({ settings }: { settings: Settings }) {
  const perks = [
    { icon: <IconTruck />, title: settings.perk1_title, text: settings.perk1_text },
    { icon: <IconStore />, title: settings.perk2_title, text: settings.perk2_text },
    { icon: <IconWhatsApp />, title: settings.perk3_title, text: settings.perk3_text },
  ].filter((p) => p.title.trim());
  if (!perks.length) return null;

  return (
    <section className="perks" aria-label="Cómo comprar">
      <ul className={`n${perks.length}`}>
        {perks.map((p) => (
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

// Promociones automáticas vigentes, anunciadas debajo de los beneficios. Los nombres
// del rubro o del producto alcanzado salen de los productos del catálogo.
export function PromoStrip({
  promos,
  products,
}: {
  promos: PublicPromo[];
  products: PublicProduct[];
}) {
  const now = new Date();
  const live = promos.filter((p) => isPromoLive(p, now));
  if (!live.length) return null;

  const names = (p: PublicPromo) => ({
    product: p.product_id ? products.find((x) => x.id === p.product_id)?.name : null,
    category: p.category_id ? products.find((x) => x.category_id === p.category_id)?.category : null,
  });

  return (
    <section className="promo-strip" aria-label="Promociones">
      <ul>
        {live.map((p) => (
          <li key={p.id}>
            <IconTag />
            <span>
              <strong>{p.name}:</strong> {promoSummary(p, names(p))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
