import { listAdminProducts } from '@/lib/data';
import { ProductTable } from '@/components/admin/ProductTable';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const products = await listAdminProducts();
  return <ProductTable initial={products} />;
}
