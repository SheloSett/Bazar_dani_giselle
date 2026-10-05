import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings, listPublicProducts, type PublicProduct } from '@/lib/data';
import { discountPercent, isOutOfStock, money, thumbUrl } from '@/lib/catalog';
import { siteBaseUrl } from '@/lib/site';
import { IconPhoto } from '@/components/icons';
import { PrintButton } from '@/components/PrintButton';

// Catálogo entero en una página pensada para imprimir o guardar como PDF desde
// el navegador (mismo enfoque que el detalle de pedido: sin librerías de PDF).
// Muestra solo lo que ya es público: los productos visibles, con sus precios
// del momento. Se llega desde el panel ("Catálogo en PDF").

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeZone: 'America/Argentina/Buenos_Aires',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `${settings.shop_name} — Catálogo para imprimir`,
    robots: { index: false, follow: false },
  };
}

// Agrupa por rubro manteniendo el orden del catálogo: los productos ya vienen
// ordenados por rubro y posición, así que los de cada rubro están contiguos
function groupByCategory(
  products: PublicProduct[]
): { name: string | null; items: PublicProduct[] }[] {
  const groups: { name: string | null; items: PublicProduct[] }[] = [];
  for (const p of products) {
    const last = groups[groups.length - 1];
    if (last && last.name === p.category) last.items.push(p);
    else groups.push({ name: p.category, items: [p] });
  }
  return groups;
}

export default async function PrintCatalogPage() {
  const [settings, products, base] = await Promise.all([
    getSettings(),
    listPublicProducts(),
    siteBaseUrl(),
  ]);
  const groups = groupByCategory(products);

  return (
    <main className="pr">
      <div className="pr-tools no-print">
        <Link className="ord-back" href="/">
          Volver al catálogo
        </Link>
        <PrintButton />
      </div>

      <header className="pr-head">
        {settings.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="brand-logo" src={thumbUrl(settings.logo)} alt="" />
        )}
        <h1>{settings.shop_name}</h1>
        {settings.tagline && <p className="pr-tag">{settings.tagline}</p>}
        <p className="pr-meta">
          {`Catálogo al ${dateFormat.format(new Date())} · Precios estimados, se confirman al cotizar`}
          {settings.whatsapp_phone && ` · WhatsApp +${settings.whatsapp_phone}`}
        </p>
      </header>

      {products.length === 0 && (
        <p className="empty">El catálogo todavía no tiene productos.</p>
      )}

      {groups.map((g) => (
        <section className="pr-cat" key={g.name ?? 'sin-rubro'}>
          <h2>{g.name ?? 'Otros productos'}</h2>
          <div className="pr-grid">
            {g.items.map((p) => {
              const pct = discountPercent(p.price, p.compare_price);
              return (
                <article className="pr-card" key={p.id}>
                  <span className="pr-ph">
                    {p.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl(p.photos[0])} alt="" />
                    ) : (
                      <IconPhoto />
                    )}
                  </span>
                  <div className="pr-info">
                    <strong>{p.name}</strong>
                    <span className="pr-price">
                      {pct !== null && p.compare_price !== null && (
                        <s>{money(p.compare_price)}</s>
                      )}
                      {money(p.price)}
                      {pct !== null && <em>{`-${pct}%`}</em>}
                    </span>
                    {isOutOfStock(p.stock) && (
                      <span className="pr-out">Sin stock, a confirmar</span>
                    )}
                    {p.description && <p>{p.description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="pr-foot">
        <span>{settings.shop_name}</span>
        {settings.whatsapp_phone && (
          <span>{`Pedidos por WhatsApp: +${settings.whatsapp_phone}`}</span>
        )}
        <span>{base.host}</span>
      </footer>
    </main>
  );
}
