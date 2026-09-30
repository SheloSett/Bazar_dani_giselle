'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type DragEvent } from 'react';
import type { AdminPhoto, AdminProduct, Category } from '@/lib/data';
import { thumbUrl } from '@/lib/catalog';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconUpload,
} from '@/components/icons';

export function ProductForm({
  categories: initialCategories,
  product,
  initialPhotos = [],
}: {
  categories: Category[];
  product?: AdminProduct;
  initialPhotos?: AdminPhoto[];
}) {
  const router = useRouter();
  const isNew = !product;

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [comparePrice, setComparePrice] = useState(
    product?.compare_price ? String(product.compare_price) : ''
  );
  const [stock, setStock] = useState(
    product?.stock === null || product?.stock === undefined ? '' : String(product.stock)
  );
  const [categoryId, setCategoryId] = useState<string>(
    product?.category_id ? String(product.category_id) : ''
  );
  const [visible, setVisible] = useState(product?.visible ?? true);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState('');
  const [photos, setPhotos] = useState<AdminPhoto[]>(initialPhotos);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addCategory = async () => {
    const nm = newCategory.trim();
    if (!nm) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nm }),
    });
    if (res.ok) {
      const cat: Category = await res.json();
      setCategories((list) =>
        list.some((c) => c.id === cat.id) ? list : [...list, cat]
      );
      setCategoryId(String(cat.id));
      setNewCategory('');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');

    const body = {
      name,
      description,
      price: Number(price),
      compare_price: comparePrice.trim() ? Number(comparePrice) : null,
      stock: stock.trim() ? Number(stock) : null,
      category_id: categoryId ? Number(categoryId) : null,
      visible,
    };

    const res = await fetch(
      isNew ? '/api/admin/products' : `/api/admin/products/${product.id}`,
      {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || 'No se pudo guardar');
      setBusy(false);
      return;
    }

    if (isNew) {
      const { id } = await res.json();
      // Recién creado: pasa a la pantalla de edición para cargar las fotos
      router.push(`/admin/products/${id}`);
      router.refresh();
    } else {
      setOk('Guardado');
      setBusy(false);
      router.refresh();
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!product || !files?.length || uploading) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    for (const f of Array.from(files)) form.append('photos', f);
    const res = await fetch(`/api/admin/products/${product.id}/photos`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      setPhotos(data.photos);
      if (data.errors?.length) setError(data.errors.join(' · '));
    } else {
      setError(data?.error || 'No se pudieron subir las fotos');
    }
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
  };

  const removePhoto = async (photo: AdminPhoto) => {
    const res = await fetch(`/api/admin/photos/${photo.id}`, { method: 'DELETE' });
    if (res.ok) setPhotos((list) => list.filter((p) => p.id !== photo.id));
  };

  // Mueve una foto de lugar; la primera es la portada
  const movePhoto = async (from: number, to: number) => {
    if (!product || reordering || to < 0 || to >= photos.length) return;
    const prev = photos;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPhotos(next);
    setReordering(true);
    setError('');
    const res = await fetch(`/api/admin/products/${product.id}/photos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next.map((p) => p.id) }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.photos) {
      setPhotos(data.photos);
    } else {
      setPhotos(prev);
      setError(data?.error || 'No se pudo cambiar el orden de las fotos');
    }
    setReordering(false);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadPhotos(e.dataTransfer.files);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 620 }}>
      {error && <div className="msg-err">{error}</div>}
      {ok && <div className="msg-ok">{ok}</div>}

      <div className="fld">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="fld-row">
        <div className="fld">
          <label htmlFor="price">Precio (pesos, sin centavos)</label>
          <input
            id="price"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="fld">
          <label htmlFor="compare-price">Precio anterior (si está en oferta)</label>
          <input
            id="compare-price"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={comparePrice}
            onChange={(e) => setComparePrice(e.target.value)}
            placeholder="Opcional"
          />
          <span className="hint">Se muestra tachado, con el porcentaje de descuento.</span>
        </div>
      </div>

      <div className="fld-row">
        <div className="fld">
          <label htmlFor="category">Categoría</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="stock">Stock</label>
          <input
            id="stock"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Sin control"
          />
          <span className="hint">
            Dejar vacío si no se controla. Con 0 aparece como “Sin stock”; con 3 o menos,
            “Quedan pocas”.
          </span>
        </div>
      </div>

      <div className="fld">
        <label htmlFor="new-category">Crear categoría nueva</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            id="new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Ej: Electrodomésticos"
          />
          <button type="button" className="btn-sm gray" onClick={addCategory}>
            Agregar
          </button>
        </div>
      </div>

      <div className="fld">
        <label htmlFor="description">Descripción</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        Visible en el catálogo
      </label>

      {product ? (
        <div className="fld">
          <label>Fotos</label>
          {photos.length > 0 && (
            <div className="photos-grid">
              {photos.map((ph, i) => (
                <div className="photo-card" key={ph.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl(ph.filename)} alt="" />
                  {i === 0 && <span className="cover-tag">Portada</span>}
                  <button
                    type="button"
                    className="del"
                    onClick={() => removePhoto(ph)}
                    aria-label="Quitar foto"
                  >
                    <IconClose />
                  </button>
                  {photos.length > 1 && (
                    <span className="move">
                      <button
                        type="button"
                        onClick={() => movePhoto(i, i - 1)}
                        disabled={i === 0 || reordering}
                        aria-label="Mover a la izquierda"
                      >
                        <IconChevronLeft />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(i, i + 1)}
                        disabled={i === photos.length - 1 || reordering}
                        aria-label="Mover a la derecha"
                      >
                        <IconChevronRight />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <label
            className={`dropzone${dragOver ? ' over' : ''}${uploading ? ' busy' : ''}`}
            htmlFor="photos"
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <IconUpload />
            <span>
              {uploading ? (
                'Subiendo fotos…'
              ) : (
                <>
                  <strong>Arrastrá las fotos acá</strong> o tocá para elegirlas
                </>
              )}
            </span>
            <input
              ref={fileRef}
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => uploadPhotos(e.target.files)}
            />
          </label>
          <span className="hint">
            JPG, PNG, WebP o AVIF, hasta 8 MB cada una; se achican y optimizan solas. La
            primera es la portada: usá las flechas para ordenarlas.
          </span>
        </div>
      ) : (
        <p className="fld hint" style={{ color: 'var(--soft)', fontSize: '0.85rem' }}>
          Las fotos se cargan en el paso siguiente, después de guardar el producto.
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button className="btn-sm" type="submit" disabled={busy}>
          {busy ? 'Guardando…' : isNew ? 'Crear producto' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          className="btn-sm gray"
          onClick={() => router.push('/admin')}
        >
          Volver
        </button>
      </div>
    </form>
  );
}
