import { notFound } from 'next/navigation';
import { getAdminProduct, listCategories, listProductPhotos } from '@/lib/data';
import { requireAdmin } from '@/lib/session';
import { ProductForm } from '@/components/admin/ProductForm';
import { parseId } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const productId = parseId((await params).id);
  if (!productId) notFound();

  const [product, categories, photos] = await Promise.all([
    getAdminProduct(productId),
    listCategories(),
    listProductPhotos(productId),
  ]);
  if (!product) notFound();

  return (
    <>
      <h1>Editar producto</h1>
      <ProductForm categories={categories} product={product} initialPhotos={photos} />
    </>
  );
}
