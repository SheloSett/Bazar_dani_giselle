import { notFound } from 'next/navigation';
import { getAdminProduct, listCategories, listProductPhotos } from '@/lib/data';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

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
