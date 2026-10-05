import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { formatOrderDateShort, listOrders } from '@/lib/orders';
import { money } from '@/lib/catalog';
import { waitingLabel } from '@/lib/order-rules';
import { OrderWhatsApp } from '@/components/admin/OrderWhatsApp';
import { ConfirmOrderButton } from '@/components/admin/ConfirmOrderButton';
import { DeleteOrderButton } from '@/components/admin/DeleteOrderButton';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  // Hay datos de clientes: se verifica la sesión acá también, no solo en el middleware
  if (!(await isAdmin())) redirect('/admin/login');

  const orders = await listOrders();

  return (
    <>
      <div className="adm-top">
        <h1>Pedidos</h1>
      </div>
      <p className="section-note">
        Se guardan cuando alguien toca “Enviar pedido por WhatsApp” en el catálogo, aunque
        después no mande el mensaje. Cuando un pedido se cobra, tocá{' '}
        <strong>Confirmar</strong>: sus unidades se descuentan del stock. Si no se concretó,
        eliminalo.
      </p>
      {/* en el celular cada fila pasa a ser una tarjeta (tbl-orders en globals.css) */}
      <table className="tbl tbl-orders">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Unidades</th>
            <th>Total</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">
                Todavía no hay pedidos.
              </td>
            </tr>
          )}
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="c-id">
                <Link href={`/admin/orders/${o.id}`}>{`#${o.id}`}</Link>
              </td>
              <td className="c-date">
                {formatOrderDateShort(o.created_at)}
                {/* solo los pendientes "esperan": de esos se muestra hace cuánto */}
                {o.confirmed_at === null && (
                  <small className="ord-wait">{waitingLabel(o.waiting_days)}</small>
                )}
              </td>
              <td className="c-who">
                {o.customer_name || '—'}
                {o.customer_phone && <small>{o.customer_phone}</small>}
              </td>
              <td className="c-units">{o.units}</td>
              <td className="price-cell c-total">{money(o.total)}</td>
              <td className="c-state">
                <ConfirmOrderButton id={o.id} confirmed={o.confirmed_at !== null} />
              </td>
              <td className="c-actions">
                <div className="row-actions">
                  <OrderWhatsApp id={o.id} name={o.customer_name} phone={o.customer_phone} />
                  <Link href={`/admin/orders/${o.id}`}>Ver</Link>
                  <DeleteOrderButton id={o.id} compact confirmed={o.confirmed_at !== null} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
