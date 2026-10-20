import Link from 'next/link';
import { getSettings, listBanners, MAX_BANNERS } from '@/lib/data';
import { isPasswordFromEnv } from '@/lib/credentials';
import { requireAdmin } from '@/lib/session';
import { photoStorage } from '@/lib/uploads';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { LogoForm } from '@/components/admin/LogoForm';
import { BannerManager } from '@/components/admin/BannerManager';
import { PasswordForm } from '@/components/admin/PasswordForm';

export const dynamic = 'force-dynamic';

// Ajustes en pestañas (?tab=…), para que no sea una sola página larguísima. En cada
// una, lo que se guarda al momento (logo, banners) va arriba y el formulario con su
// botón de guardar, al final.
const TABS = [
  { key: 'negocio', label: 'Negocio' },
  { key: 'portada', label: 'Portada' },
  { key: 'redes', label: 'Redes' },
  { key: 'sistema', label: 'Sistema' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab: asked } = await searchParams;
  const tab: Tab = TABS.find((t) => t.key === asked)?.key ?? 'negocio';

  const [settings, banners, usingInitial] = await Promise.all([
    getSettings(),
    tab === 'portada' ? listBanners() : [],
    tab === 'sistema' ? isPasswordFromEnv() : false,
  ]);
  const storage = photoStorage();

  return (
    <div className="settings">
      <h1>Ajustes</h1>
      <nav className="adm-tabs" aria-label="Secciones de Ajustes">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/settings?tab=${t.key}`}
            aria-current={t.key === tab ? 'page' : undefined}
            scroll={false}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'negocio' && (
        <>
          <section className="adm-card">
            <h2 className="card-t">Logo</h2>
            <LogoForm initial={settings.logo} shopName={settings.shop_name} />
          </section>
          <SettingsForm initial={settings} section="negocio" />
        </>
      )}

      {tab === 'portada' && (
        <>
          <section className="adm-card">
            <h2 className="card-t">Banners</h2>
            <BannerManager initial={banners} max={MAX_BANNERS} />
          </section>
          <SettingsForm initial={settings} section="portada" />
        </>
      )}

      {tab === 'redes' && <SettingsForm initial={settings} section="redes" />}

      {tab === 'sistema' && (
        <>
          <section className="adm-card">
            <h2 className="card-t">Clave del panel</h2>
            <PasswordForm usingInitial={usingInitial} />
          </section>

          <section className="adm-card">
            <h2 className="card-t">Fotos</h2>
            <p>
              {storage.kind === 'cloudinary' ? (
                <>
                  Las fotos del catálogo, los banners y el logo se guardan en Cloudinary
                  (cuenta <b>{storage.cloud}</b>, carpeta <b>{storage.folder}</b>).
                </>
              ) : (
                <>Las fotos del catálogo, los banners y el logo se guardan en el disco del servidor.</>
              )}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
