import { listCategories } from '@/lib/data';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await listCategories();
  return (
    <>
      <h1>Nuevo producto</h1>
      <ProductForm categories={categories} />
    </>
  );
}
