import type { ReactNode } from 'react';
import type { Settings } from '@/lib/data';
import { IconFacebook, IconInstagram, IconTikTok, IconWhatsApp } from '@/components/icons';

// Redes del negocio cargadas en Ajustes; la que está vacía no aparece. waHref suma el
// WhatsApp de los pedidos (en la portada no va: ya tiene su botón).
export function SocialLinks({
  settings,
  waHref = null,
  className,
}: {
  settings: Settings;
  waHref?: string | null;
  className: string;
}) {
  const links: { href: string; label: string; icon: ReactNode }[] = [
    { href: settings.instagram_url, label: 'Instagram', icon: <IconInstagram /> },
    { href: settings.tiktok_url, label: 'TikTok', icon: <IconTikTok /> },
    { href: settings.facebook_url, label: 'Facebook', icon: <IconFacebook /> },
    { href: waHref ?? '', label: 'WhatsApp', icon: <IconWhatsApp /> },
  ];
  const shown = links.filter((l) => l.href);
  if (!shown.length) return null;

  return (
    <ul className={className}>
      {shown.map((l) => (
        <li key={l.label}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener"
            aria-label={`${settings.shop_name} en ${l.label}`}
            title={l.label}
          >
            {l.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ¿Hay alguna red cargada? (para mostrar o no el bloque que las contiene)
export const hasSocials = (s: Settings) => !!(s.instagram_url || s.tiktok_url || s.facebook_url);
