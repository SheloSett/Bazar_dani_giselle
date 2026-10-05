import { AdminNav } from '@/components/admin/AdminNav';
import { PendingAlert } from '@/components/admin/PendingAlert';
import { pendingReminder } from '@/lib/order-rules';
import { pendingSummary } from '@/lib/orders';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // El recordatorio sale de los pedidos: la sesión se verifica acá también
  await requireAdmin();

  // Pedidos sin confirmar: el menú muestra cuántos son, y si alguno espera hace
  // más de un día aparece el recordatorio arriba de todas las pantallas del panel
  const pending = await pendingSummary();
  const reminder = pendingReminder(pending.stale, pending.oldest_days);

  return (
    <div className="adm-shell">
      <AdminNav pendingOrders={pending.count} />
      <div className="adm">
        {reminder && <PendingAlert title={reminder.title} advice={reminder.advice} />}
        {children}
      </div>
    </div>
  );
}
