'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminProduct } from '@/lib/data';
import { LOW_STOCK, money, thumbUrl } from '@/lib/catalog';
import { IconPhoto } from '@/components/icons';

function StockCell({ stock }: { stock: number | null }) {
  if (stock === null) return <span title="Sin control de stock">—</span>;
  if (stock === 0) return <span className="pill out">Sin stock</span>;
  if (stock <= LOW_STOCK) return <span className="pill low">{stock}</span>;
  return <>{stock}</>;
}

// embedded: dentro de otra página (ej. categorías), sin título ni columna de categoría
export function ProductTable({
  initial,
  embedded = false,
}: {
  initial: AdminProduct[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);

  const toggleVisible = async (p: AdminProduct) => {
    setBusyId(p.id);
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !p.visible }),
    });
    if (res.ok) {
      setProducts((list) =>
        list.map((x) => (x.id === p.id ? { ...x, visible: !p.visible } : x))
      );
    }
    setBusyId(null);
  };

  const remove = async (p: AdminProduct) => {
    if (!confirm(`¿Eliminar "${p.name}"? Se borran también sus fotos.`)) return;
    setBusyId(p.id);
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts((list) => list.filter((x) => x.id !== p.id));
      router.refresh();
    }
    setBusyId(null);
  };

  return (
    <>
      {!embedded && (
        <div className="adm-top">
          <h1>Productos</h1>
          <Link className="btn-sm" href="/admin/products/new">
            Nuevo producto
          </Link>
        </div>
      )}
      <table className="tbl">
        <thead>
          <tr>
            <th></th>
            <th>Nombre</th>
            {!embedded && <th>Categoría</th>}
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={embedded ? 6 : 7} className="empty">
                Todavía no hay productos. Creá el primero con “Nuevo producto”.
              </td>
            </tr>
          )}
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                {p.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={thumbUrl(p.photos[0])} alt="" />
                ) : (
                  <span className="thumb-empty">
                    <IconPhoto className="ic" />
                  </span>
                )}
              </td>
              <td>{p.name}</td>
              {!embedded && <td>{p.category ?? '—'}</td>}
              <td className="price-cell">
                {p.compare_price !== null && p.compare_price > p.price && (
                  <>
                    <s>{money(p.compare_price)}</s>{' '}
                  </>
                )}
                {money(p.price)}
              </td>
              <td>
                <StockCell stock={p.stock} />
              </td>
              <td>
                <button
                  className={p.visible ? 'pill on' : 'pill'}
                  disabled={busyId === p.id}
                  onClick={() => toggleVisible(p)}
                  title="Cambiar visibilidad en el catálogo"
                >
                  {p.visible ? 'Visible' : 'Oculto'}
                </button>
              </td>
              <td>
                <div className="row-actions">
                  <Link href={`/admin/products/${p.id}`}>Editar</Link>
                  <button
                    className="btn-sm danger"
                    disabled={busyId === p.id}
                    onClick={() => remove(p)}
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
