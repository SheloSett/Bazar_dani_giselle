import { AdminNav } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-shell">
      <AdminNav />
      <div className="adm">{children}</div>
    </div>
  );
}
