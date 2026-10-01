'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { AdminPhoto, AdminProduct, Category } from '@/lib/data';
import { discountPercent, thumbUrl } from '@/lib/catalog';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconUpload,
} from '@/components/icons';
import { CategoryPicker } from '@/components/admin/CategoryPicker';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
// Aviso que viaja de "Nuevo producto" a la pantalla de edición a la que se pasa al crear
const FLASH_KEY = 'producto-creado';

// Foto elegida en "Nuevo producto": espera en el navegador hasta que el producto existe
interface PendingPhoto {
  key: string;
  file: File;
  url: string;
}

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
  const productId = product?.id;

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
  const [photos, setPhotos] = useState<AdminPhoto[]>(initialPhotos);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Guardando…');
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingPhoto[]>([]);
  const pendingSeq = useRef(0);

  // Al llegar desde "Nuevo producto": muestra cómo salió la creación
  useEffect(() => {
    if (!productId) return;
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      const flash = JSON.parse(raw) as { id: number; error?: string };
      if (flash.id !== productId) return;
      if (flash.error) setError(flash.error);
      else setOk('Producto creado');
    } catch {
      /* sin almacenamiento: no hay aviso */
    }
  }, [productId]);

  // Las vistas previas ocupan memoria del navegador: se liberan al salir
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // La crea el selector de categoría ("Crear «…»"); si ya existía con ese nombre, vuelve esa
  const createCategory = async (nm: string): Promise<Category | null> => {
    setError('');
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nm }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'No se pudo crear la categoría');
      return null;
    }
    const cat = data as Category;
    setCategories((list) => (list.some((c) => c.id === cat.id) ? list : [...list, cat]));
    return cat;
  };

  // Sube las fotos en espera al producto recién creado. Devuelve el problema, si hubo
  const uploadPending = async (id: number): Promise<string> => {
    const form = new FormData();
    for (const p of pending) form.append('photos', p.file);
    const res = await fetch(`/api/admin/products/${id}/photos`, { method: 'POST', body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data)
      return 'El producto se creó, pero no se pudieron subir las fotos. Probá subirlas de nuevo.';
    if (data.errors?.length)
      return `El producto se creó, pero algunas fotos no se subieron: ${data.errors.join(' · ')}`;
    return '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBusyLabel('Guardando…');
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
      let photoError = '';
      if (pending.length) {
        setBusyLabel('Subiendo fotos…');
        photoError = await uploadPending(id);
      }
      try {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify({ id, error: photoError }));
      } catch {
        /* sin almacenamiento: se pasa igual, sin aviso */
      }
      // Ya existe: sigue en su pantalla de edición
      router.push(`/admin/products/${id}`);
      router.refresh();
    } else {
      setOk('Guardado');
      setBusy(false);
      router.refresh();
    }
  };

  // ---------- fotos de un producto que ya existe: se suben y ordenan al momento ----------

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

  // ---------- fotos de un producto nuevo: quedan en espera hasta crearlo ----------

  const queuePhotos = (files: FileList | null) => {
    if (!files?.length || busy) return;
    const added: PendingPhoto[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!PHOTO_TYPES.includes(file.type)) rejected.push(`${file.name}: formato no admitido`);
      else if (file.size > MAX_PHOTO_BYTES) rejected.push(`${file.name}: supera los 8 MB`);
      else
        added.push({
          key: `p${pendingSeq.current++}`,
          file,
          url: URL.createObjectURL(file),
        });
    }
    if (added.length) setPending((list) => [...list, ...added]);
    setError(rejected.join(' · '));
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePending = (index: number) => {
    URL.revokeObjectURL(pending[index].url);
    setPending((list) => list.filter((_, i) => i !== index));
  };

  const movePending = (from: number, to: number) => {
    if (to < 0 || to >= pending.length) return;
    const next = [...pending];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPending(next);
  };

  // Una sola grilla para los dos casos
  const shots = product
    ? photos.map((ph) => ({ key: String(ph.id), src: thumbUrl(ph.filename) }))
    : pending.map((p) => ({ key: p.key, src: p.url }));
  const addFiles = (files: FileList | null) =>
    product ? uploadPhotos(files) : queuePhotos(files);
  const removeShot = (i: number) => (product ? removePhoto(photos[i]) : removePending(i));
  const moveShot = (from: number, to: number) =>
    product ? movePhoto(from, to) : movePending(from, to);
  const photosBusy = uploading || (isNew && busy);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  // Cómo va a quedar la oferta con lo que hay escrito ahora
  const bothPrices = price.trim() !== '' && comparePrice.trim() !== '';
  const offerPct = bothPrices ? discountPercent(Number(price), Number(comparePrice)) : null;
  const offerInvalid = bothPrices && Number(comparePrice) <= Number(price);

  return (
    <form onSubmit={submit} className="pform">
      <div className="pform-grid">
        <div className="pform-main">
          <section className="adm-card">
            <h2 className="card-t">Datos del producto</h2>
            <div className="fld">
              <label htmlFor="name">Nombre</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="fld">
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="hint">Opcional. Material, medidas, para qué sirve.</span>
            </div>
          </section>

          <section className="adm-card">
            <h2 className="card-t">Precio</h2>
            <div className="fld-row">
              <div className="fld">
                <label htmlFor="price">Precio</label>
                <div className="in-pre">
                  <span>$</span>
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
                <span className="hint">En pesos, sin centavos.</span>
              </div>
              <div className="fld">
                <label htmlFor="compare-price">Precio anterior</label>
                <div className="in-pre">
                  <span>$</span>
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
                </div>
                {offerInvalid ? (
                  <span className="hint warn">Tiene que ser mayor que el precio.</span>
                ) : offerPct !== null ? (
                  <span className="hint">{`Se muestra tachado, con la etiqueta -${offerPct}%.`}</span>
                ) : (
                  <span className="hint">Solo si está en oferta: se muestra tachado.</span>
                )}
              </div>
            </div>
          </section>

          <section className="adm-card">
            <h2 className="card-t">Fotos</h2>
            <div className="fld">
              {shots.length > 0 && (
                <div className="photos-grid">
                  {shots.map((shot, i) => (
                    <div className="photo-card" key={shot.key}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shot.src} alt="" />
                      {i === 0 && <span className="cover-tag">Portada</span>}
                      <button
                        type="button"
                        className="del"
                        onClick={() => removeShot(i)}
                        disabled={photosBusy}
                        aria-label="Quitar foto"
                      >
                        <IconClose />
                      </button>
                      {shots.length > 1 && (
                        <span className="move">
                          <button
                            type="button"
                            onClick={() => moveShot(i, i - 1)}
                            disabled={i === 0 || reordering || photosBusy}
                            aria-label="Mover a la izquierda"
                          >
                            <IconChevronLeft />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveShot(i, i + 1)}
                            disabled={i === shots.length - 1 || reordering || photosBusy}
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
                className={`dropzone${dragOver ? ' over' : ''}${photosBusy ? ' busy' : ''}`}
                htmlFor="photos"
                onDragOver={onDragOver}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <IconUpload />
                <span>
                  {photosBusy ? (
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
                  accept={PHOTO_TYPES.join(',')}
                  multiple
                  hidden
                  disabled={photosBusy}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
              <span className="hint">
                JPG, PNG, WebP o AVIF, hasta 8 MB cada una; se achican y optimizan solas. La
                primera es la portada: usá las flechas para ordenarlas.
                {isNew && ' Se suben al crear el producto.'}
              </span>
            </div>
          </section>
        </div>

        <aside className="pform-side">
          <section className="adm-card">
            <h2 className="card-t">Visibilidad</h2>
            <label className="check">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
              />
              Visible en el catálogo
            </label>
            <p className="card-note">
              Si lo desmarcás queda guardado, pero los clientes no lo ven.
            </p>
          </section>

          <section className="adm-card">
            <h2 className="card-t">Categoría</h2>
            <div className="fld">
              <CategoryPicker
                id="category"
                categories={categories}
                value={categoryId ? Number(categoryId) : null}
                onChange={(id) => setCategoryId(id ? String(id) : '')}
                onCreate={createCategory}
              />
              <span className="hint">Escribí para buscar; si no existe, la creás desde acá.</span>
            </div>
          </section>

          <section className="adm-card">
            <h2 className="card-t">Stock</h2>
            <div className="fld">
              <label htmlFor="stock">Unidades disponibles</label>
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
                Vacío = no se controla. Con 0 figura “Sin stock”; con 3 o menos, “Últimas
                unidades”.
              </span>
            </div>
          </section>
        </aside>
      </div>

      {/* Barra fija abajo: el botón de guardar y los avisos siempre a la vista */}
      <div className="pform-bar">
        {error && <div className="msg-err">{error}</div>}
        {ok && <div className="msg-ok">{ok}</div>}
        <div className="pform-actions">
          <button type="button" className="btn-sm gray" onClick={() => router.push('/admin')}>
            Volver
          </button>
          <button className="btn-sm" type="submit" disabled={busy}>
            {busy ? busyLabel : isNew ? 'Crear producto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}
