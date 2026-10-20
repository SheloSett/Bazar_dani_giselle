'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type DragEvent } from 'react';
import type { Banner } from '@/lib/data';
import { thumbUrl } from '@/lib/catalog';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconUpload,
} from '@/components/icons';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// Fotos del carrusel de la portada: se suben, ordenan y quitan al momento
export function BannerManager({ initial, max }: { initial: Banner[]; max: number }) {
  const router = useRouter();
  const [banners, setBanners] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const full = banners.length >= max;

  // Todas las rutas devuelven la lista como quedó
  const send = async (url: string, init: RequestInit, failMsg: string) => {
    setBusy(true);
    setError('');
    const res = await fetch(url, init);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.banners) {
      setBanners(data.banners);
      if (data.errors?.length) setError(data.errors.join(' · '));
      router.refresh();
    } else {
      setError(data?.error || failMsg);
    }
    setBusy(false);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    const form = new FormData();
    for (const f of Array.from(files)) form.append('photos', f);
    await send('/api/admin/banners', { method: 'POST', body: form }, 'No se pudieron subir las fotos');
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = (b: Banner) =>
    send(`/api/admin/banners/${b.id}`, { method: 'DELETE' }, 'No se pudo quitar el banner');

  const move = (from: number, to: number) => {
    if (busy || to < 0 || to >= banners.length) return;
    const next = [...banners];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return send(
      '/api/admin/banners',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: next.map((b) => b.id) }),
      },
      'No se pudo cambiar el orden'
    );
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!full) upload(e.dataTransfer.files);
  };

  return (
    <div>
      {error && <div className="msg-err">{error}</div>}

      {banners.length > 0 && (
        <div className="photos-grid">
          {banners.map((b, i) => (
            <div className="photo-card wide" key={b.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(b.filename)} alt="" />
              <span className="cover-tag">{i + 1}</span>
              <button
                type="button"
                className="del"
                onClick={() => remove(b)}
                disabled={busy}
                aria-label="Quitar banner"
              >
                <IconClose />
              </button>
              {banners.length > 1 && (
                <span className="move">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0 || busy}
                    aria-label="Mover antes"
                  >
                    <IconChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === banners.length - 1 || busy}
                    aria-label="Mover después"
                  >
                    <IconChevronRight />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!full && (
        <label
          className={`dropzone${dragOver ? ' over' : ''}${busy ? ' busy' : ''}`}
          htmlFor="banner-files"
          onDragOver={onDragOver}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <IconUpload />
          <span>
            {busy ? (
              'Guardando…'
            ) : (
              <>
                <strong>Arrastrá las fotos acá</strong> o tocá para elegirlas
              </>
            )}
          </span>
          <input
            ref={fileRef}
            id="banner-files"
            type="file"
            accept={PHOTO_TYPES.join(',')}
            multiple
            hidden
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      )}
      <p className="section-note" style={{ marginTop: 12 }}>
        Sin banners, la portada queda fija. Con alguno, la portada pasa a ser un carrusel:
        primero va la del logo, con el título y los botones, y después estas fotos en este
        orden; cambian solas cada pocos segundos y también se pueden pasar con el dedo. Hasta{' '}
        {max} fotos, JPG, PNG, WebP o AVIF de hasta 8 MB. Lo ideal es que sean horizontales
        (por ejemplo 1800 × 1100); si tienen otra forma se ven enteras, sin cortar, sobre la
        misma foto desenfocada.
      </p>
    </div>
  );
}
