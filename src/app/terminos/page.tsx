import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { termsSections } from '@/lib/legal';
import { LegalPage } from '@/components/LegalPage';

// Términos y condiciones del catálogo. El texto sale de lib/legal.ts, con el
// nombre del negocio cargado en Ajustes.

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shop_name } = await getSettings();
  return { title: `Términos y condiciones — ${shop_name}` };
}

export default async function TermsPage() {
  const settings = await getSettings();
  return (
    <LegalPage
      settings={settings}
      title="Términos y condiciones"
      sections={termsSections(settings.shop_name, !!settings.whatsapp_phone)}
      other={{ href: '/privacidad', label: 'Política de privacidad' }}
    />
  );
}
