import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { formatOrderDate, getAdminOrder } from '@/lib/orders';
import { money, thumbUrl } from '@/lib/catalog';
import { parseId } from '@/lib/validate';
import { IconPhoto } from '@/components/icons';
import { PrintButton } from '@/components/PrintButton';
import { ConfirmOrderButton } from '@/components/admin/ConfirmOrderButton';
import { DeleteOrderButton } from '@/components/admin/DeleteOrderButton';
import { OrderWhatsApp } from '@/components/admin/OrderWhatsApp';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Hay datos de clientes: se verifica la sesión acá también, no solo en el middleware
  if (!(await isAdmin())) redirect('/admin/login');

  const id = parseId((await params).id);
  const order = id ? await getAdminOrder(id) : null;
  if (!order) notFound();

  const units = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <div className="adm-top">
        <h1>{`Pedido #${order.id}`}</h1>
        <div className="ord-actions no-print">
          <ConfirmOrderButton id={order.id} confirmed={order.confirmed_at !== null} />
          <OrderWhatsApp
            id={order.id}
            name={order.customer_name}
            phone={order.customer_phone}
            label="Escribir por WhatsApp"
          />
          <PrintButton />
          <DeleteOrderButton id={order.id} />
        </div>
      </div>
      <p className="section-note">
        {`${formatOrderDate(order.created_at)} · ${units} ${units === 1 ? 'unidad' : 'unidades'}`}
        {order.confirmed_at && ` · Confirmado el ${formatOrderDate(order.confirmed_at)}`}
      </p>

      <div className="pform-grid">
        <section className="adm-card">
          <h2 className="card-t">Productos</h2>
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
          <p className="card-note">Precios al momento de armar el pedido.</p>
        </section>

        <aside className="pform-side">
          <section className="adm-card">
            <h2 className="card-t">Cliente</h2>
            <dl className="ord-who">
              <dt>Nombre</dt>
              <dd>{order.customer_name || '—'}</dd>
              <dt>Teléfono</dt>
              <dd>{order.customer_phone || '—'}</dd>
            </dl>
          </section>
          <p className="card-note no-print">
            <Link href={`/pedido/${order.token}`} target="_blank" rel="noopener">
              Ver el link que va en el mensaje
            </Link>
          </p>
        </aside>
      </div>

      <p className="no-print" style={{ marginTop: 18 }}>
        <Link className="ord-back" href="/admin/orders">
          Volver a los pedidos
        </Link>
      </p>
    </>
  );
}
