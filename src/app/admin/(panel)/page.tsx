import { listAdminProducts } from '@/lib/data';
import { requireAdmin } from '@/lib/session';
import { ProductTable } from '@/components/admin/ProductTable';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  await requireAdmin();
  const products = await listAdminProducts();
  return <ProductTable initial={products} />;
}
