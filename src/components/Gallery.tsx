'use client';

import { useState, type CSSProperties, type MouseEvent } from 'react';
import { photoUrl, thumbUrl } from '@/lib/catalog';
import { useSnapStrip } from '@/components/useSnapStrip';
import { FitPhoto } from '@/components/FitPhoto';
import { IconChevronLeft, IconChevronRight, IconPhoto } from '@/components/icons';

// Galería de la ficha: foto grande deslizable (siempre entera), flechas, miniaturas y
// zoom con clic (solo con mouse; en el celular se desliza). No es al pasar el mouse:
// la ficha se abre donde se hizo clic y el zoom se activaba solo.
export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const strip = useSnapStrip(photos.length);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  if (photos.length === 0) {
    return (
      <div className="gallery empty">
        <IconPhoto />
      </div>
    );
  }

  const pointer = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  const zoomStyle = zoom
    ? ({ '--zx': `${zoom.x}%`, '--zy': `${zoom.y}%` } as CSSProperties)
    : undefined;

  return (
    <div className="gallery">
      <div className="g-main">
        <div className="g-strip" ref={strip.ref} onScroll={strip.onScroll}>
          {photos.map((f, i) => (
            <div
              key={f}
              className={zoom && i === strip.idx ? 'g-slide zoom' : 'g-slide'}
              style={i === strip.idx ? zoomStyle : undefined}
              onClick={(e) => setZoom(zoom ? null : pointer(e))}
              onMouseMove={(e) => zoom && setZoom(pointer(e))}
              onMouseLeave={() => setZoom(null)}
            >
              <FitPhoto
                src={photoUrl(f)}
                alt={photos.length > 1 ? `${alt} (${i + 1} de ${photos.length})` : alt}
                fit="whole"
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="g-nav prev"
              onClick={() => strip.go(strip.idx - 1)}
              disabled={strip.idx === 0}
              aria-label="Foto anterior"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className="g-nav next"
              onClick={() => strip.go(strip.idx + 1)}
              disabled={strip.idx === photos.length - 1}
              aria-label="Foto siguiente"
            >
              <IconChevronRight />
            </button>
            <span className="g-count" aria-live="polite">
              {strip.idx + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="g-thumbs">
          {photos.map((f, i) => (
            <button
              type="button"
              key={f}
              className={i === strip.idx ? 'on' : undefined}
              onClick={() => strip.go(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={i === strip.idx}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(f)} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
