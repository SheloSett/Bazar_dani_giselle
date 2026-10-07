import type { Metadata } from 'next';
import { cache } from 'react';
import { getSettings, listCategories, listPublicProducts } from '@/lib/data';
import { ogImagePath } from '@/lib/catalog';
import { siteBaseUrl } from '@/lib/site';
import { Catalog } from '@/components/Catalog';

// El catálogo se arma con datos de la base en cada request
export const dynamic = 'force-dynamic';

// Una sola lectura por pedido, compartida entre los metadatos y la página
const loadCatalog = cache(async () => {
  const [products, categories, settings] = await Promise.all([
    listPublicProducts(),
    listCategories(),
    getSettings(),
  ]);
  return { products, categories, settings };
});

export async function generateMetadata(): Promise<Metadata> {
  const [{ products, settings }, base] = await Promise.all([loadCatalog(), siteBaseUrl()]);
  const description = settings.tagline || 'Catálogo de productos con pedidos por WhatsApp';
  // Foto para la vista previa al compartir el link: la primera del catálogo
  const cover = products.find((p) => p.photos.length > 0)?.photos[0];

  return {
    metadataBase: base,
    title: settings.shop_name,
    description,
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      url: '/',
      siteName: settings.shop_name,
      title: settings.shop_name,
      description,
      images: cover
        ? [{ url: ogImagePath(cover), width: 1200, height: 630, alt: settings.shop_name }]
        : [],
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: settings.shop_name,
      description,
    },
  };
}

export default async function HomePage() {
  const { products, categories, settings } = await loadCatalog();

  // Al navegador van solo los rubros que tienen algo para mostrar: los vacíos o con
  // todos sus productos ocultos no tienen por qué figurar en el código de la página
  const inUse = new Set(products.map((p) => p.category));
  const shown = categories.filter((c) => inUse.has(c.name));

  return (
    <Catalog
      products={products}
      categories={shown.map((c) => c.name)}
      categoryPhotos={Object.fromEntries(
        shown.flatMap((c) => (c.photo ? [[c.name, c.photo]] : []))
      )}
      settings={settings}
    />
  );
}
