import { listAdminProducts, listCategories } from '@/lib/data';
import { requireAdmin } from '@/lib/session';
import { CategoryManager } from '@/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  await requireAdmin();
  const [categories, products] = await Promise.all([listCategories(), listAdminProducts()]);
  return <CategoryManager initial={categories} products={products} />;
}
