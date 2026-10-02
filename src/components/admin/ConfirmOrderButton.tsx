'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Pill "Pendiente"/"Confirmado" en la lista y el detalle de pedidos. Marca si
// el pedido se concretó: queda la fecha en la base (confirmed_at), para poder
// contar más adelante cuántos pedidos terminaron en venta.
export function ConfirmOrderButton({
  id,
  confirmed,
}: {
  id: number;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !confirmed }),
    });
    if (res.ok) router.refresh();
    setBusy(false);
  };

  return (
    <button
      type="button"
      className={confirmed ? 'pill on' : 'pill'}
      onClick={toggle}
      disabled={busy}
      title={
        confirmed
          ? 'Pedido confirmado: tocá para volverlo a pendiente'
          : 'Marcar el pedido como confirmado'
      }
    >
      {confirmed ? 'Confirmado' : 'Pendiente'}
    </button>
  );
}
