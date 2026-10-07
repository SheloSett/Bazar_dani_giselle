'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconBasket,
  IconBox,
  IconExternal,
  IconLogout,
  IconPercent,
  IconPrint,
  IconSliders,
  IconTag,
} from '@/components/icons';

// Barra lateral del panel (en el celular pasa a ser una barra arriba).
// pendingOrders: pedidos sin confirmar, se muestran al lado de "Pedidos".
export function AdminNav({ pendingOrders = 0 }: { pendingOrders?: number }) {
  const path = usePathname();
  // Productos abarca la lista, el alta y la edición
  const section = path.startsWith('/admin/settings')
    ? 'settings'
    : path.startsWith('/admin/categories')
      ? 'categories'
      : path.startsWith('/admin/orders')
        ? 'orders'
        : path.startsWith('/admin/promos')
          ? 'promos'
          : 'products';
  const current = (s: typeof section) => (s === section ? 'page' : undefined);

  return (
    <nav className="adm-side" aria-label="Panel de administración">
      <span className="brand">Administración</span>
      <div className="side-links">
        <Link href="/admin" aria-current={current('products')}>
          <IconBox /> Productos
        </Link>
        <Link href="/admin/categories" className="side-sub" aria-current={current('categories')}>
          <IconTag /> Categorías
        </Link>
        <Link
          href="/admin/orders"
          aria-current={current('orders')}
          aria-label={
            pendingOrders > 0
              ? `Pedidos, ${pendingOrders} ${pendingOrders === 1 ? 'pendiente' : 'pendientes'}`
              : undefined
          }
        >
          <IconBasket /> Pedidos
          {pendingOrders > 0 && (
            <span
              className="side-count"
              title={pendingOrders === 1 ? '1 pedido pendiente' : `${pendingOrders} pedidos pendientes`}
            >
              {pendingOrders}
            </span>
          )}
        </Link>
        <Link href="/admin/promos" aria-current={current('promos')}>
          <IconPercent /> Promociones
        </Link>
        <Link href="/admin/settings" aria-current={current('settings')}>
          <IconSliders /> Ajustes
        </Link>
      </div>
      <div className="side-foot">
        {/* en el celular quedan solo los íconos: el texto se oculta pero se sigue leyendo */}
        <Link href="/imprimir" target="_blank" rel="noopener" title="Catálogo para imprimir o guardar en PDF">
          <IconPrint /> <span className="side-label">Catálogo en PDF</span>
        </Link>
        <Link href="/" target="_blank" rel="noopener" title="Ver catálogo">
          <IconExternal /> <span className="side-label">Ver catálogo</span>
        </Link>
        <form action="/api/admin/logout" method="post">
          <button type="submit" title="Salir">
            <IconLogout /> <span className="side-label">Salir</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
