import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { privacySections } from '@/lib/legal';
import { LegalPage } from '@/components/LegalPage';

// Política de privacidad: qué datos se piden al hacer un pedido y para qué. El
// texto sale de lib/legal.ts, con el nombre del negocio cargado en Ajustes.

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shop_name } = await getSettings();
  return { title: `Política de privacidad — ${shop_name}` };
}

export default async function PrivacyPage() {
  const settings = await getSettings();
  return (
    <LegalPage
      settings={settings}
      title="Política de privacidad"
      sections={privacySections(settings.shop_name, !!settings.whatsapp_phone)}
      other={{ href: '/terminos', label: 'Términos y condiciones' }}
    />
  );
}
