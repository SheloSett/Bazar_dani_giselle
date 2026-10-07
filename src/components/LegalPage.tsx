import Link from 'next/link';
import type { Settings } from '@/lib/data';
import { LEGAL_UPDATED, type LegalSection } from '@/lib/legal';
import { Brand } from '@/components/Brand';
import { IconChevronLeft, IconWhatsApp } from '@/components/icons';
import { LegalFooter } from '@/components/LegalFooter';

// Página de texto legal (/terminos y /privacidad): el mismo encabezado y pie del
// catálogo, con un botón bien visible para volver, las secciones, y abajo el
// contacto y el link al otro documento
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
  const waHref = settings.whatsapp_phone ? `https://wa.me/${settings.whatsapp_phone}` : null;

  return (
    <>
      <header className="site-header">
        <div className="header-in">
          <Link href="/" className="brand-link" aria-label={`${settings.shop_name}: ir al catálogo`}>
            <Brand name={settings.shop_name} logo={settings.logo} withName={settings.logo_with_name} />
          </Link>
          <Link className="btn btn-primary btn-back" href="/">
            <IconChevronLeft /> Volver al catálogo
          </Link>
        </div>
      </header>

      <main className="ord legal">
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
          <Link className="btn btn-primary" href="/">
            <IconChevronLeft /> Volver al catálogo
          </Link>
          {waHref && (
            <a className="btn btn-wa" href={waHref} target="_blank" rel="noopener">
              <IconWhatsApp /> Escribinos por WhatsApp
            </a>
          )}
          <Link href={other.href}>{other.label}</Link>
        </div>
      </main>

      <LegalFooter settings={settings} waHref={waHref} />
    </>
  );
}
