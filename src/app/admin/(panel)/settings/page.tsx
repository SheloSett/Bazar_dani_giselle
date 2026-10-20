import { getSettings, listBanners, MAX_BANNERS } from '@/lib/data';
import { isPasswordFromEnv } from '@/lib/credentials';
import { requireAdmin } from '@/lib/session';
import { photoStorage } from '@/lib/uploads';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { LogoForm } from '@/components/admin/LogoForm';
import { BannerManager } from '@/components/admin/BannerManager';
import { PasswordForm } from '@/components/admin/PasswordForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, banners, usingInitial] = await Promise.all([
    getSettings(),
    listBanners(),
    isPasswordFromEnv(),
  ]);
  const storage = photoStorage();
  return (
    <div className="settings">
      <h1>Ajustes</h1>
      <SettingsForm initial={settings} />

      <section className="adm-card">
        <h2 className="card-t">Logo</h2>
        <LogoForm initial={settings.logo} shopName={settings.shop_name} />
      </section>

      <section className="adm-card">
        <h2 className="card-t">Banners de la portada</h2>
        <BannerManager initial={banners} max={MAX_BANNERS} />
      </section>

      <section className="adm-card">
        <h2 className="card-t">Fotos</h2>
        <p>
          {storage.kind === 'cloudinary' ? (
            <>
              Las fotos del catálogo, los banners y el logo se guardan en Cloudinary (cuenta{' '}
              <b>{storage.cloud}</b>, carpeta <b>{storage.folder}</b>).
            </>
          ) : (
            <>Las fotos del catálogo, los banners y el logo se guardan en el disco del servidor.</>
          )}
        </p>
      </section>

      <section className="adm-card">
        <h2 className="card-t">Clave del panel</h2>
        <PasswordForm usingInitial={usingInitial} />
      </section>
    </div>
  );
}
