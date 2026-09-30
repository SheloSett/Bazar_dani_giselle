'use client';

import { IconPhoto } from '@/components/icons';

export interface CategoryTile {
  name: string;
  count: number;
  photo: string | null;
}

// Rubros con foto: al tocar uno se filtra la grilla
export function CategoryTiles({
  tiles,
  active,
  onPick,
}: {
  tiles: CategoryTile[];
  active: string;
  onPick: (name: string) => void;
}) {
  if (tiles.length < 2) return null;

  return (
    <section className="rubros" aria-labelledby="rubros-t">
      <h2 id="rubros-t" className="sec-t">
        Rubros
      </h2>
      <div className="rubros-grid">
        {tiles.map((t) => (
          <button
            key={t.name}
            type="button"
            className="rubro"
            aria-pressed={t.name === active}
            onClick={() => onPick(t.name)}
          >
            {t.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photo} alt="" loading="lazy" draggable={false} />
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
    </section>
  );
}
