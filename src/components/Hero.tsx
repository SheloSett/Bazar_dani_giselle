'use client';

import type { Settings } from '@/lib/data';
import { photoUrl, thumbUrl } from '@/lib/catalog';
import { IconStore, IconTruck, IconWhatsApp } from '@/components/icons';
import { FitPhoto } from '@/components/FitPhoto';
import { HeroCarousel } from '@/components/HeroCarousel';
import { hasSocials, SocialLinks } from '@/components/SocialLinks';

// Portada: bloque de color con el logo en grande y centrado arriba (pedido del
// cliente: el del encabezado queda chico), el título, los botones, las redes y un
// collage de fotos. Con banners cargados en Ajustes pasa a ser un carrusel: primero
// este bloque y después las fotos.
export function Hero({
  settings,
  stats,
  photos,
  banners,
  waHref,
  onBrowse,
}: {
  settings: Settings;
  stats: string;
  photos: string[];
  banners: string[];
  waHref: string | null;
  onBrowse: () => void;
}) {
  const main = (
    <div className="hero-in">
      {settings.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hero-logo" src={thumbUrl(settings.logo)} alt={settings.shop_name} />
      )}
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
        {hasSocials(settings) && (
          <div className="hero-social">
            <span>Seguinos</span>
            <SocialLinks settings={settings} className="social-row" />
          </div>
        )}
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
  );

  if (!banners.length) return <section className="hero">{main}</section>;

  // Los banners suelen traer texto (una promo): se ven siempre enteros, nunca cortados
  return (
    <HeroCarousel
      slides={[
        main,
        ...banners.map((b) => (
          <div className="hero-banner" key={b}>
            <FitPhoto src={photoUrl(b)} alt="" fit="whole" loading="lazy" />
          </div>
        )),
      ]}
    />
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
