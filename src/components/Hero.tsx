'use client';

import { useEffect, useState } from 'react';
import type { PublicProduct, Settings } from '@/lib/data';
import { thumbUrl } from '@/lib/catalog';
import {
  countdownParts,
  formatPromoDate,
  isPromoLive,
  promoBadge,
  promoOffer,
  type PublicPromo,
} from '@/lib/promos';
import { IconChevronRight, IconStore, IconTag, IconTruck, IconWhatsApp } from '@/components/icons';
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

// Hora actual que avanza cada segundo mientras haga falta (cuenta regresiva)
function useNow(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Campañas vigentes: una tarjeta grande por cada una, debajo de los beneficios, con
// el descuento en grande, la cuenta regresiva si tiene fecha de fin y un botón que
// lleva a los productos alcanzados (el rubro, el producto o toda la grilla).
export function Campaigns({
  promos,
  products,
  onPick,
  onBrowse,
  onProduct,
}: {
  promos: PublicPromo[];
  products: PublicProduct[];
  onPick: (category: string) => void;
  onBrowse: () => void;
  onProduct: (p: PublicProduct) => void;
}) {
  const now = useNow(promos.some((p) => !!p.ends_at));
  const live = promos.filter((p) => p.code === null && isPromoLive(p, now));
  if (!live.length) return null;

  const names = (p: PublicPromo) => ({
    product: p.product_id ? products.find((x) => x.id === p.product_id)?.name : null,
    category: p.category_id ? products.find((x) => x.category_id === p.category_id)?.category : null,
  });
  const go = (p: PublicPromo) => {
    if (p.scope === 'product') {
      const prod = products.find((x) => x.id === p.product_id);
      if (prod) return onProduct(prod);
    }
    if (p.scope === 'category') {
      const cat = names(p).category;
      if (cat) return onPick(cat);
    }
    onBrowse();
  };

  return (
    <section className="campaigns" aria-label="Promociones vigentes">
      {live.map((p) => {
        const badge = promoBadge(p);
        const cd = countdownParts(p.ends_at, now);
        const ends = formatPromoDate(p.ends_at);
        const units = cd
          ? [
              ...(cd.days > 0 ? [[String(cd.days), cd.days === 1 ? 'día' : 'días']] : []),
              [pad(cd.hours), 'h'],
              [pad(cd.minutes), 'min'],
              [pad(cd.seconds), 'seg'],
            ]
          : [];
        return (
          <article className="camp" key={p.id}>
            <div className="camp-body">
              <IconTag />
              <h3>{p.name}</h3>
              <p>{promoOffer(p, names(p))}</p>
              {cd ? (
                <div className={cd.urgent ? 'camp-cd urgent' : 'camp-cd'} role="timer">
                  <span className="camp-cd-label">
                    {cd.urgent ? (cd.days === 0 ? '¡Último día!' : '¡Últimos días!') : 'Termina en'}
                  </span>
                  <span className="camp-cd-units">
                    {units.map(([v, l]) => (
                      <span className="camp-cd-unit" key={l}>
                        {/* el reloj del servidor y el del navegador difieren: no es un error */}
                        <span className="camp-cd-num" suppressHydrationWarning>
                          {v}
                        </span>
                        <span className="camp-cd-lbl">{l}</span>
                      </span>
                    ))}
                  </span>
                </div>
              ) : (
                ends && <p className="camp-ends">{`Hasta el ${ends}`}</p>
              )}
              <button type="button" className="camp-cta" onClick={() => go(p)}>
                Ver productos <IconChevronRight />
              </button>
            </div>
            <div className="camp-badge" aria-hidden="true">
              <span className={badge.amount.length > 4 ? 'camp-amount long' : 'camp-amount'}>
                {badge.amount}
              </span>
              <span className="camp-off">{badge.suffix}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
