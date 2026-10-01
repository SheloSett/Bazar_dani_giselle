import { listAdminProducts, listCategories } from '@/lib/data';
import { CategoryManager } from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const [categories, products] = await Promise.all([listCategories(), listAdminProducts()]);
  return <CategoryManager initial={categories} products={products} />;
}
