'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconTrash } from '@/components/icons';

// compact: solo el tachito, para cada fila de la lista de pedidos.
// confirmed: el pedido ya descontó stock, y eliminarlo no lo devuelve (se avisa).
export function DeleteOrderButton({
  id,
  compact = false,
  confirmed = false,
}: {
  id: number;
  compact?: boolean;
  confirmed?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    const stockNote = confirmed
      ? '\n\nEstá confirmado: el stock que descontó no se devuelve. Si la venta se canceló, primero volvelo a pendiente.'
      : '';
    if (!confirm(`¿Eliminar el pedido #${id}? No se puede deshacer.${stockNote}`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/admin/orders');
      router.refresh();
    } else {
      setBusy(false);
      alert('No se pudo eliminar el pedido.');
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        className="btn-sm danger btn-trash"
        onClick={remove}
        disabled={busy}
        title={`Eliminar el pedido #${id}`}
        aria-label={`Eliminar el pedido #${id}`}
      >
        <IconTrash />
      </button>
    );
  }

  return (
    <button type="button" className="btn-sm danger no-print" onClick={remove} disabled={busy}>
      {busy ? 'Eliminando…' : 'Eliminar'}
    </button>
  );
}
