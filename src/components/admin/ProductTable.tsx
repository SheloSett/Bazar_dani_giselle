'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminProduct } from '@/lib/data';
import { LOW_STOCK, money, thumbUrl } from '@/lib/catalog';
import { IconChevronDown, IconChevronUp, IconPhoto } from '@/components/icons';

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

  // Mueve el producto un lugar arriba o abajo dentro de su rubro y guarda el
  // orden nuevo. El orden solo compite dentro del rubro, así que el resto de la
  // tabla no cambia. Las filas de un mismo rubro van juntas en la tabla.
  const move = async (p: AdminProduct, dir: -1 | 1) => {
    const siblings = products.filter((x) => x.category_id === p.category_id);
    const i = siblings.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const order = siblings.map((x) => x.id);
    [order[i], order[j]] = [order[j], order[i]];
    setBusyId(p.id);
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    if (res.ok) {
      // El mismo intercambio en la tabla, para verlo al instante
      setProducts((list) => {
        const a = list.findIndex((x) => x.id === siblings[i].id);
        const b = list.findIndex((x) => x.id === siblings[j].id);
        const next = [...list];
        [next[a], next[b]] = [next[b], next[a]];
        return next;
      });
      // El catálogo y la foto automática de los rubros dependen del orden
      router.refresh();
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
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th></th>{/* flechas de orden */}
              <th></th>{/* foto */}
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
                {/* colSpan era `embedded ? 6 : 7`: se le suma 1 por la columna nueva de flechas de orden */}
                <td colSpan={embedded ? 7 : 8} className="empty">
                  Todavía no hay productos. Creá el primero con “Nuevo producto”.
                </td>
              </tr>
            )}
            {products.map((p) => {
              // Primero y último de su rubro: las flechas hacia afuera se apagan
              const siblings = products.filter((x) => x.category_id === p.category_id);
              const first = siblings[0]?.id === p.id;
              const last = siblings[siblings.length - 1]?.id === p.id;
              return (
              <tr key={p.id}>
                <td className="mv-cell">
                  <span className="mv">
                    <button
                      type="button"
                      onClick={() => move(p, -1)}
                      disabled={busyId !== null || first}
                      title="Subir en el orden del catálogo"
                      aria-label={`Subir ${p.name}`}
                    >
                      <IconChevronUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(p, 1)}
                      disabled={busyId !== null || last}
                      title="Bajar en el orden del catálogo"
                      aria-label={`Bajar ${p.name}`}
                    >
                      <IconChevronDown />
                    </button>
                  </span>
                </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
