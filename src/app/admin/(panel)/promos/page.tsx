import { listAdminProducts, listCategories } from '@/lib/data';
import { listPromos } from '@/lib/promos-data';
import { requireAdmin } from '@/lib/session';
import { PromoManager } from '@/components/admin/PromoManager';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
  await requireAdmin();
  const [promos, categories, products] = await Promise.all([
    listPromos(),
    listCategories(),
    listAdminProducts(),
  ]);
  return (
    <PromoManager
      initial={promos}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
