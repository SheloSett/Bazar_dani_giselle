import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { formatOrderDateShort, listOrders } from '@/lib/orders';
import { money } from '@/lib/catalog';
import { OrderWhatsApp } from '@/components/admin/OrderWhatsApp';

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
        Se guardan cuando alguien toca “Enviar pedido por WhatsApp” en el catálogo. Si la
        persona después no manda el mensaje, el pedido queda igual en esta lista.
      </p>
      <table className="tbl">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Unidades</th>
            <th>Total</th>
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
              <td>
                <Link href={`/admin/orders/${o.id}`}>{`#${o.id}`}</Link>
              </td>
              <td>{formatOrderDateShort(o.created_at)}</td>
              <td>{o.customer_name || '—'}</td>
              <td>{o.customer_phone || '—'}</td>
              <td>{o.units}</td>
              <td className="price-cell">{money(o.total)}</td>
              <td>
                <div className="row-actions">
                  <OrderWhatsApp id={o.id} name={o.customer_name} phone={o.customer_phone} />
                  <Link href={`/admin/orders/${o.id}`}>Ver</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
