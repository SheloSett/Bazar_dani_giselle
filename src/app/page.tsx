import type { Metadata } from 'next';
import { getSettings, listCategories, listPublicProducts } from '@/lib/data';
import { Catalog } from '@/components/Catalog';

// El catálogo se arma con datos de la base en cada request
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.shop_name,
    description: settings.tagline || 'Catálogo de productos con pedidos por WhatsApp',
  };
}

export default async function HomePage() {
  const [products, categories, settings] = await Promise.all([
    listPublicProducts(),
    listCategories(),
    getSettings(),
  ]);

  return (
    <Catalog
      products={products}
      categories={categories.map((c) => c.name)}
      settings={settings}
    />
  );
}
