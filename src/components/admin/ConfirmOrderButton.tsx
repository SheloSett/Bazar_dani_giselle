'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { shortStockQuestion, type ShortItem } from '@/lib/order-rules';

// Estado del pedido en la lista y el detalle. Pendiente: muestra el botón
// "Confirmar", que marca la venta como hecha (queda la fecha en confirmed_at) y
// descuenta las unidades del stock. Confirmado: tocando la pastilla vuelve a
// pendiente y las unidades vuelven al stock.
export function ConfirmOrderButton({
  id,
  confirmed,
}: {
  id: number;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const send = (body: { confirmed: boolean; force?: boolean }) =>
    fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const confirmOrder = async () => {
    setBusy(true);
    let res = await send({ confirmed: true });
    // No alcanza el stock de algún producto: se pregunta antes de confirmar igual
    if (res.status === 409) {
      const data = (await res.json().catch(() => null)) as { short?: ShortItem[] } | null;
      if (!window.confirm(shortStockQuestion(id, data?.short ?? []))) {
        setBusy(false);
        return;
      }
      res = await send({ confirmed: true, force: true });
    }
    if (res.ok) router.refresh();
    else alert('No se pudo confirmar el pedido.');
    setBusy(false);
  };

  const backToPending = async () => {
    if (
      !window.confirm(
        `¿Volver el pedido #${id} a pendiente? Las unidades que descontó vuelven al stock.`
      )
    )
      return;
    setBusy(true);
    const res = await send({ confirmed: false });
    if (res.ok) router.refresh();
    else alert('No se pudo cambiar el pedido.');
    setBusy(false);
  };

  if (confirmed) {
    return (
      <button
        type="button"
        className="pill on"
        onClick={backToPending}
        disabled={busy}
        title="Pedido confirmado: tocá para volverlo a pendiente"
      >
        Confirmado
      </button>
    );
  }

  return (
    <span className="ord-state">
      <span className="pill wait">Pendiente</span>
      <button
        type="button"
        className="btn-sm no-print"
        onClick={confirmOrder}
        disabled={busy}
        title="Marcar el pedido como confirmado y descontar las unidades del stock"
      >
        Confirmar
      </button>
    </span>
  );
}
