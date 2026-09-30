import { getSettings } from '@/lib/data';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <h1>Ajustes del negocio</h1>
      <SettingsForm initial={settings} />
    </>
  );
}
