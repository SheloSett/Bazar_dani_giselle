'use client';

import type { Settings } from '@/lib/data';
import { SiteFooter } from '@/components/SiteFooter';

// El pie del sitio en las páginas de texto legal. Sin la columna de rubros: esos
// botones filtran la grilla del catálogo, que acá no está.
export function LegalFooter({ settings, waHref }: { settings: Settings; waHref: string | null }) {
  return (
    <SiteFooter settings={settings} categories={[]} waHref={waHref} withBar={false} onPick={() => {}} />
  );
}
