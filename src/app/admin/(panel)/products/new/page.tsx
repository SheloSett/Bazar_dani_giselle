import { listCategories } from '@/lib/data';
import { requireAdmin } from '@/lib/session';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <>
      <h1>Nuevo producto</h1>
      <ProductForm categories={categories} />
    </>
  );
}
