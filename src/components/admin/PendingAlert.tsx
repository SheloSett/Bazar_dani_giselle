'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Recordatorio de pedidos que siguen pendientes después de un día. Va arriba de
// todas las pantallas del panel; en la lista de pedidos no lleva el link, porque
// ya se está ahí.
export function PendingAlert({ title, advice }: { title: string; advice: string }) {
  const onList = usePathname() === '/admin/orders';
  return (
    <div className="adm-alert no-print" role="status">
      <p>
        <strong>{title}</strong> {advice}
      </p>
      {!onList && <Link href="/admin/orders">Ver pedidos</Link>}
    </div>
  );
}
