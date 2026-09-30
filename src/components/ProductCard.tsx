'use client';

import type { PublicProduct } from '@/lib/data';
import { discountPercent, isOutOfStock, money, stockLabel, thumbUrl } from '@/lib/catalog';
import { useSnapStrip } from '@/components/useSnapStrip';
import { IconChevronLeft, IconChevronRight, IconPhoto } from '@/components/icons';

export function ProductCard({
  product: p,
  onOpen,
}: {
  product: PublicProduct;
  onOpen: (p: PublicProduct) => void;
}) {
  const strip = useSnapStrip(p.photos.length);
  const pct = discountPercent(p.price, p.compare_price);
  const out = isOutOfStock(p.stock);
  const low = out ? null : stockLabel(p.stock);
  const open = () => onOpen(p);

  return (
    <article className={out ? 'item out' : 'item'}>
      <div className="ph">
        {p.photos.length === 0 ? (
          <button type="button" className="ph-empty" onClick={open} aria-label={p.name}>
            <IconPhoto />
          </button>
        ) : (
          <div className="ph-strip" ref={strip.ref} onScroll={strip.onScroll} onClick={open}>
            {p.photos.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={f}
                src={thumbUrl(f)}
                alt={i === 0 ? p.name : `${p.name} (foto ${i + 1})`}
                loading="lazy"
                draggable={false}
              />
            ))}
          </div>
        )}

        {pct !== null && <span className="badge off">{`-${pct}%`}</span>}
        {low && <span className="badge low">{low}</span>}
        {out && <span className="out-tag">Sin stock</span>}

        {p.photos.length > 1 && (
          <>
            <button
              type="button"
              className="ph-nav prev"
              onClick={() => strip.go(strip.idx - 1)}
              disabled={strip.idx === 0}
              aria-label="Foto anterior"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className="ph-nav next"
              onClick={() => strip.go(strip.idx + 1)}
              disabled={strip.idx === p.photos.length - 1}
              aria-label="Foto siguiente"
            >
              <IconChevronRight />
            </button>
            <span className="dots" aria-hidden="true">
              {p.photos.map((f, i) => (
                <i key={f} className={i === strip.idx ? 'on' : undefined} />
              ))}
            </span>
          </>
        )}
      </div>

      <button type="button" className="info" onClick={open}>
        <span className="name">{p.name}</span>
        <span className="price">
          {pct !== null && p.compare_price !== null && <s>{money(p.compare_price)}</s>}
          {money(p.price)}
        </span>
      </button>
    </article>
  );
}
