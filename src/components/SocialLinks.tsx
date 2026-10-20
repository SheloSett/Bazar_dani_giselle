import type { ReactNode } from 'react';
import type { Settings } from '@/lib/data';
import { socialHandle } from '@/lib/validate';
import {
  IconChevronRight,
  IconFacebook,
  IconInstagram,
  IconTikTok,
  IconWhatsApp,
} from '@/components/icons';

interface Social {
  key: 'instagram' | 'tiktok' | 'facebook' | 'whatsapp';
  href: string;
  label: string;
  icon: ReactNode;
  // lo que va debajo del nombre en la tarjeta: el @usuario, o una invitación
  handle: string;
}

// Redes del negocio cargadas en Ajustes; la que está vacía no aparece. waHref suma el
// WhatsApp de los pedidos al final.
function socials(settings: Settings, waHref: string | null): Social[] {
  const list: Social[] = [
    {
      key: 'instagram',
      href: settings.instagram_url,
      label: 'Instagram',
      icon: <IconInstagram />,
      handle: socialHandle('instagram', settings.instagram_url) ?? 'Seguinos',
    },
    {
      key: 'tiktok',
      href: settings.tiktok_url,
      label: 'TikTok',
      icon: <IconTikTok />,
      handle: socialHandle('tiktok', settings.tiktok_url) ?? 'Seguinos',
    },
    {
      key: 'facebook',
      href: settings.facebook_url,
      label: 'Facebook',
      icon: <IconFacebook />,
      handle: socialHandle('facebook', settings.facebook_url) ?? 'Seguinos',
    },
    { key: 'whatsapp', href: waHref ?? '', label: 'WhatsApp', icon: <IconWhatsApp />, handle: 'Escribinos' },
  ];
  return list.filter((s) => s.href);
}

// Botones redondos solo con el logo (portada y pie). En la portada no va el WhatsApp:
// ya tiene su botón.
export function SocialLinks({
  settings,
  waHref = null,
  className,
}: {
  settings: Settings;
  waHref?: string | null;
  className: string;
}) {
  const shown = socials(settings, waHref);
  if (!shown.length) return null;

  return (
    <ul className={className}>
      {shown.map((l) => (
        <li key={l.key}>
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

// Tarjetas grandes, cada una con el color de su red, entre los productos y el pie
// (pedido de la clienta, como las de IGWT Store)
export function SocialCards({ settings, waHref }: { settings: Settings; waHref: string | null }) {
  if (!hasSocials(settings)) return null;
  const shown = socials(settings, waHref);

  return (
    <section className="social-cards" aria-label="Redes">
      <ul className={`n${shown.length}`}>
        {shown.map((s) => (
          <li key={s.key}>
            <a className={`social-card ${s.key}`} href={s.href} target="_blank" rel="noopener">
              <span className="sc-ic">{s.icon}</span>
              <span className="sc-txt">
                <strong>{s.label}</strong>
                <small>{s.handle}</small>
              </span>
              <IconChevronRight />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ¿Hay alguna red cargada? (para mostrar o no el bloque que las contiene)
export const hasSocials = (s: Settings) => !!(s.instagram_url || s.tiktok_url || s.facebook_url);
