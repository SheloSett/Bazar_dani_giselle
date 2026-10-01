'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconPhoto } from '@/components/icons';
import { FitPhoto } from '@/components/FitPhoto';

export interface CategoryTile {
  name: string;
  count: number;
  photo: string | null;
}

// Rubros con foto: al tocar uno se filtra la grilla. Entran hasta 4 a la vez;
// si hay más, la tira se desliza con flechas (o con el dedo en el celular).
export function CategoryTiles({
  tiles,
  active,
  onPick,
}: {
  tiles: CategoryTile[];
  active: string;
  onPick: (name: string) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [can, setCan] = useState({ prev: false, next: false });

  // Hacia dónde queda algo por ver: se recalcula al deslizar y al cambiar el ancho
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const prev = el.scrollLeft > 4;
    const next = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
    setCan((c) => (c.prev === prev && c.next === next ? c : { prev, next }));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, tiles.length]);

  // Avanza o retrocede una "página" (los rubros que entran a la vista)
  const slide = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  if (tiles.length < 2) return null;

  return (
    <section className="rubros" aria-labelledby="rubros-t">
      <h2 id="rubros-t" className="sec-t">
        Rubros
      </h2>
      <div className="rubros-wrap">
        <div className="rubros-grid" ref={track} onScroll={update}>
          {tiles.map((t) => (
            <button
              key={t.name}
              type="button"
              className="rubro"
              aria-pressed={t.name === active}
              onClick={() => onPick(t.name)}
            >
              {t.photo ? (
                <FitPhoto src={t.photo} alt="" loading="lazy" />
              ) : (
                <IconPhoto />
              )}
              <span className="rubro-txt">
                <strong>{t.name}</strong>
                <small>
                  {t.count} {t.count === 1 ? 'producto' : 'productos'}
                </small>
              </span>
            </button>
          ))}
        </div>
        {(can.prev || can.next) && (
          <>
            <button
              type="button"
              className="rubros-nav prev"
              onClick={() => slide(-1)}
              disabled={!can.prev}
              aria-label="Rubros anteriores"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className="rubros-nav next"
              onClick={() => slide(1)}
              disabled={!can.next}
              aria-label="Más rubros"
            >
              <IconChevronRight />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
