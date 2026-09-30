import { getSettings } from '@/lib/data';
import { isPasswordFromEnv } from '@/lib/credentials';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { PasswordForm } from '@/components/admin/PasswordForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, usingInitial] = await Promise.all([getSettings(), isPasswordFromEnv()]);
  return (
    <>
      <h1>Ajustes del negocio</h1>
      <SettingsForm initial={settings} />

      <h2>Clave del panel</h2>
      <PasswordForm usingInitial={usingInitial} />
    </>
  );
}
