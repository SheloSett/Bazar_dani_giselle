'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteOrderButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!confirm(`¿Eliminar el pedido #${id}? No se puede deshacer.`)) return;
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

  return (
    <button type="button" className="btn-sm danger no-print" onClick={remove} disabled={busy}>
      {busy ? 'Eliminando…' : 'Eliminar'}
    </button>
  );
}
