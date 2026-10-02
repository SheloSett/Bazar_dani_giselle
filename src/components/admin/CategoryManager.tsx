'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminProduct, Category } from '@/lib/data';
import { thumbUrl } from '@/lib/catalog';
import { CATEGORY_NAME_MAX } from '@/lib/validate';
import { ProductTable } from '@/components/admin/ProductTable';
import { IconChevronDown, IconChevronUp, IconPhoto } from '@/components/icons';
import { FitPhoto } from '@/components/FitPhoto';

const count = (n: number) => `${n} ${n === 1 ? 'producto' : 'productos'}`;

// La foto que usa el catálogo cuando la categoría no tiene propia: la del primer
// producto visible con foto (los sin stock van al final, como en el catálogo)
function autoCover(list: AdminProduct[]): string | null {
  const withPhoto = list.filter((p) => p.visible && p.photos.length > 0);
  withPhoto.sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0));
  return withPhoto[0]?.photos[0] ?? null;
}

// Foto del rubro: la propia o, si no tiene, la automática (marcada como tal)
function CoverPhoto({
  category,
  auto,
  onChange,
}: {
  category: Category;
  auto: string | null;
  onChange: (c: Category) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (init: RequestInit) => {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/categories/${category.id}/photo`, init);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'No se pudo cambiar la foto');
    onChange(data);
  };

  const upload = (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return send({ method: 'POST', body: form });
  };

  const shown = category.photo ?? auto;

  return (
    <div className="cat-cover">
      <div className="cat-cover-img">
        {shown ? (
          <FitPhoto src={thumbUrl(shown)} alt="" />
        ) : (
          <IconPhoto />
        )}
        {!category.photo && shown && <span className="cat-auto">Automática</span>}
      </div>
      <div className="cat-cover-actions">
        <button
          type="button"
          className="btn-sm gray"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'Subiendo…' : category.photo ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {category.photo && (
          <button
            type="button"
            className="btn-sm gray"
            disabled={busy}
            onClick={() => send({ method: 'DELETE' })}
          >
            Quitar
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // permite volver a elegir el mismo archivo
            if (file) void upload(file);
          }}
        />
      </div>
      {error && <p className="msg-err">{error}</p>}
    </div>
  );
}

// Lista de categorías: crear, renombrar, borrar, cambiar su foto y ver sus productos
export function CategoryManager({
  initial,
  products,
}: {
  initial: Category[];
  products: AdminProduct[];
}) {
  const router = useRouter();
  const [cats, setCats] = useState(initial);
  const [newName, setNewName] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null); // foto opcional al crear
  const newFileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (newFile ? URL.createObjectURL(newFile) : null), [newFile]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview); // libera la vista previa al cambiarla
  }, [preview]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [error, setError] = useState('');

  const inCategory = (id: number | null) => products.filter((p) => p.category_id === id);
  const replace = (c: Category) => setCats((list) => list.map((x) => (x.id === c.id ? c : x)));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy('new');
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(null);
      return setError(data.error || 'No se pudo crear la categoría');
    }
    // Con un nombre que ya existe, la API devuelve la existente (y no se le toca la foto)
    if (cats.some((c) => c.id === data.id)) {
      setBusy(null);
      return setError(`Ya existe "${data.name}"`);
    }

    let created: Category = data;
    if (newFile) {
      const form = new FormData();
      form.append('photo', newFile);
      const up = await fetch(`/api/admin/categories/${created.id}/photo`, {
        method: 'POST',
        body: form,
      });
      const upData = await up.json().catch(() => ({}));
      if (up.ok) created = upData;
      else
        setError(
          `Se creó "${created.name}", pero no se pudo subir la foto: ${upData.error || 'error'}. ` +
            'Probá de nuevo con “Subir foto”.'
        );
    }
    setBusy(null);
    setCats((list) => [...list, created]);
    setNewName('');
    setNewFile(null);
  };

  const startEdit = (c: Category) => {
    setError('');
    setEditing(c.id);
    setDraft(c.name);
  };

  const saveEdit = async (e: React.FormEvent, c: Category) => {
    e.preventDefault();
    setError('');
    setBusy(c.id);
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draft }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || 'No se pudo renombrar');
    replace(data);
    setEditing(null);
    router.refresh(); // la tabla de productos muestra el nombre nuevo
  };

  // Mueve el rubro un lugar arriba o abajo: cambia el orden de los rubros en el
  // catálogo (tiles y pestañas) y el de sus productos en la grilla
  const moveCat = async (c: Category, dir: -1 | 1) => {
    const i = cats.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const order = cats.map((x) => x.id);
    [order[i], order[j]] = [order[j], order[i]];
    setError('');
    setBusy(c.id);
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) return setError(data?.error || 'No se pudo cambiar el orden');
    setCats(data); // la API devuelve las categorías ya en el orden nuevo
    router.refresh(); // el catálogo y la tabla de productos siguen este orden
  };

  const remove = async (c: Category) => {
    const n = inCategory(c.id).length;
    const msg = n
      ? `¿Borrar la categoría "${c.name}"? Sus ${count(n)} no se borran: quedan sin categoría.`
      : `¿Borrar la categoría "${c.name}"?`;
    if (!confirm(msg)) return;
    setError('');
    setBusy(c.id);
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) return setError('No se pudo borrar la categoría');
    setCats((list) => list.filter((x) => x.id !== c.id));
    // Sus productos pasan a "Sin categoría": se vuelven a pedir los datos
    router.refresh();
  };

  const uncategorized = inCategory(null);

  return (
    <>
      <div className="adm-top">
        <h1>Categorías</h1>
      </div>
      <p className="section-note">
        Son los rubros del catálogo. La foto es la que se ve en cada rubro; si no le cargás
        una, se usa la del primer producto (figura como “Automática”). Con las flechas los
        ordenás como se ven en el catálogo. Borrar una categoría no borra sus productos:
        quedan sin categoría.
      </p>
      {error && <p className="msg-err">{error}</p>}

      <form className="cat-new" onSubmit={create}>
        <button
          type="button"
          className={newFile ? 'cat-new-photo on' : 'cat-new-photo'}
          onClick={() => newFileRef.current?.click()}
          title={newFile ? `Foto: ${newFile.name} (clic para cambiarla)` : 'Elegir foto (opcional)'}
          aria-label={newFile ? `Cambiar la foto elegida (${newFile.name})` : 'Elegir foto (opcional)'}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <IconPhoto className="ic" />
          )}
        </button>
        <input
          ref={newFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(e) => {
            setNewFile(e.target.files?.[0] ?? null);
            e.target.value = ''; // permite volver a elegir el mismo archivo
          }}
        />
        <input
          aria-label="Nombre de la categoría nueva"
          placeholder="Nueva categoría"
          value={newName}
          maxLength={CATEGORY_NAME_MAX}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn-sm" type="submit" disabled={busy === 'new' || !newName.trim()}>
          {busy === 'new' ? 'Agregando…' : 'Agregar'}
        </button>
      </form>
      {newFile && (
        <p className="cat-new-hint">
          Foto: {newFile.name} ·{' '}
          <button type="button" onClick={() => setNewFile(null)}>
            quitar
          </button>
        </p>
      )}

      <ul className="cat-list">
        {cats.length === 0 && <li className="empty">Todavía no hay categorías.</li>}
        {/* idx: para apagar la flecha de subir en el primero y la de bajar en el último */}
        {cats.map((c, idx) => {
          const list = inCategory(c.id);
          return (
            <li key={c.id} className="cat-item">
              <div className="cat-top">
                <CoverPhoto category={c} auto={autoCover(list)} onChange={replace} />
                <div>
                  {editing === c.id ? (
                    <form className="cat-edit" onSubmit={(e) => saveEdit(e, c)}>
                      <input
                        aria-label={`Nuevo nombre para ${c.name}`}
                        value={draft}
                        maxLength={CATEGORY_NAME_MAX}
                        autoFocus
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      />
                      <button
                        className="btn-sm"
                        type="submit"
                        disabled={busy === c.id || !draft.trim()}
                      >
                        Guardar
                      </button>
                      <button className="btn-sm gray" type="button" onClick={() => setEditing(null)}>
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <div className="cat-head">
                      <strong>{c.name}</strong>
                      <span className="cat-n">{count(list.length)}</span>
                      <div className="cat-actions">
                        <span className="mv mv-row">
                          <button
                            type="button"
                            onClick={() => moveCat(c, -1)}
                            disabled={busy !== null || idx === 0}
                            title="Subir en el orden del catálogo"
                            aria-label={`Subir ${c.name}`}
                          >
                            <IconChevronUp />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCat(c, 1)}
                            disabled={busy !== null || idx === cats.length - 1}
                            title="Bajar en el orden del catálogo"
                            aria-label={`Bajar ${c.name}`}
                          >
                            <IconChevronDown />
                          </button>
                        </span>
                        <button className="btn-sm gray" type="button" onClick={() => startEdit(c)}>
                          Renombrar
                        </button>
                        <button
                          className="btn-sm danger"
                          type="button"
                          onClick={() => remove(c)}
                          disabled={busy === c.id}
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {list.length > 0 && (
                <details className="cat-det">
                  <summary>Ver productos</summary>
                  {/* la key la vuelve a armar si cambian los productos (ej. al borrar otra categoría) */}
                  <ProductTable key={list.map((p) => p.id).join()} initial={list} embedded />
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {uncategorized.length > 0 && (
        <>
          <h2>Sin categoría</h2>
          <p className="section-note">
            Aparecen en el catálogo, pero en ningún rubro. Entrá a cada uno (Editar) para
            asignarle una categoría.
          </p>
          <ProductTable
            key={uncategorized.map((p) => p.id).join()}
            initial={uncategorized}
            embedded
          />
        </>
      )}
    </>
  );
}
