import Link from 'next/link';
import type { Settings } from '@/lib/data';
import { LEGAL_UPDATED, type LegalSection } from '@/lib/legal';
import { Brand } from '@/components/Brand';
import { IconWhatsApp } from '@/components/icons';

// Página de texto legal (/terminos y /privacidad): el encabezado con la marca, las
// secciones, y abajo el contacto y el link al otro documento
export function LegalPage({
  settings,
  title,
  sections,
  other,
}: {
  settings: Settings;
  title: string;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <main className="ord legal">
      <div className="ord-top">
        <Link href="/" aria-label={`${settings.shop_name}: ir al catálogo`}>
          <Brand name={settings.shop_name} logo={settings.logo} />
        </Link>
        <Link className="ord-back no-print" href="/">
          Ver el catálogo
        </Link>
      </div>

      <h1>{title}</h1>
      <p className="ord-meta">{`Última actualización: ${LEGAL_UPDATED}`}</p>

      {sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.body.map((block, i) =>
            typeof block === 'string' ? (
              <p key={i}>{block}</p>
            ) : (
              <ul key={i}>
                {block.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          )}
        </section>
      ))}

      <div className="legal-foot no-print">
        {settings.whatsapp_phone && (
          <a
            className="btn btn-wa"
            href={`https://wa.me/${settings.whatsapp_phone}`}
            target="_blank"
            rel="noopener"
          >
            <IconWhatsApp /> Escribinos por WhatsApp
          </a>
        )}
        <Link href={other.href}>{other.label}</Link>
      </div>
    </main>
  );
}
