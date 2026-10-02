'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconBasket,
  IconBox,
  IconExternal,
  IconLogout,
  IconPrint,
  IconSliders,
  IconTag,
} from '@/components/icons';

// Barra lateral del panel (en el celular pasa a ser una barra arriba)
export function AdminNav() {
  const path = usePathname();
  // Productos abarca la lista, el alta y la edición
  const section = path.startsWith('/admin/settings')
    ? 'settings'
    : path.startsWith('/admin/categories')
      ? 'categories'
      : path.startsWith('/admin/orders')
        ? 'orders'
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
        <Link href="/admin/orders" aria-current={current('orders')}>
          <IconBasket /> Pedidos
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
