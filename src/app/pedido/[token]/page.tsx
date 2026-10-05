import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getSettings } from '@/lib/data';
import { formatOrderDate, getOrder } from '@/lib/orders';
import { money, ogImagePath, thumbUrl } from '@/lib/catalog';
import { siteBaseUrl } from '@/lib/site';
import { ORDER_TOKEN_RE } from '@/lib/validate';
import { IconPhoto } from '@/components/icons';
import { Brand } from '@/components/Brand';
import { PrintButton } from '@/components/PrintButton';

// Detalle de un pedido con fotos: es el link que va en el mensaje de WhatsApp.
// Lo ve quien tenga el link (el código no se puede adivinar) y no se indexa.
// No muestra el nombre ni el teléfono de quien pidió: eso queda solo en el panel.

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

// Una sola lectura por pedido, compartida entre los metadatos y la página
const loadOrder = cache(async (token: string) =>
  ORDER_TOKEN_RE.test(token) ? getOrder(token) : null
);

const units = (n: number) => `${n} ${n === 1 ? 'unidad' : 'unidades'}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const order = await loadOrder((await params).token);
  if (!order) return { title: 'Pedido no encontrado', robots: { index: false, follow: false } };

  const [settings, base] = await Promise.all([getSettings(), siteBaseUrl()]);
  const count = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const title = `Pedido #${order.id} — ${settings.shop_name}`;
  const description = `${units(count)} · Total estimado ${money(order.total)}`;
  // La vista previa del link en WhatsApp muestra la foto del primer producto
  const cover = order.items.find((i) => i.photo)?.photo;

  return {
    metadataBase: base,
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      siteName: settings.shop_name,
      title,
      description,
      images: cover ? [{ url: ogImagePath(cover), width: 1200, height: 630 }] : [],
    },
  };
}

export default async function OrderPage({ params }: Props) {
  const order = await loadOrder((await params).token);
  if (!order) notFound();

  const settings = await getSettings();
  const count = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <main className="ord">
      <div className="ord-top">
        <Brand name={settings.shop_name} logo={settings.logo} />
        <PrintButton />
      </div>

      <h1>{`Pedido #${order.id}`}</h1>
      <p className="ord-meta">{`${formatOrderDate(order.created_at)} · ${units(count)}`}</p>

      <ul className="ord-items">
        {order.items.map((item, i) => (
          <li key={i}>
            <span className="ord-ph">
              {item.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(item.photo)} alt="" />
              ) : (
                <IconPhoto />
              )}
            </span>
            <span className="ord-nm">
              <strong>{item.name}</strong>
              <small>{`${item.quantity} × ${money(item.price)}`}</small>
            </span>
            <span className="ord-sub">{money(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="ord-total">
        <span>Total estimado</span>
        <strong>{money(order.total)}</strong>
      </div>
      <p className="ord-note">
        Precios al momento de armar el pedido; se confirman al cotizar.
      </p>

      <Link className="ord-back no-print" href="/">
        Ver el catálogo
      </Link>
      <p className="ord-legal no-print">
        <Link href="/terminos">Términos y condiciones</Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacidad">Política de privacidad</Link>
      </p>
    </main>
  );
}
