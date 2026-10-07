'use client';

import type { PublicProduct } from '@/lib/data';
import {
  discountPercent,
  isOutOfStock,
  money,
  stockDetail,
  stockLabel,
  thumbUrl,
} from '@/lib/catalog';
import { productPromo, productPromoText, type PublicPromo } from '@/lib/promos';
import { useSnapStrip } from '@/components/useSnapStrip';
import { FitPhoto } from '@/components/FitPhoto';
import { IconChevronLeft, IconChevronRight, IconPhoto } from '@/components/icons';

export function ProductCard({
  product: p,
  promos = [],
  onOpen,
}: {
  product: PublicProduct;
  // campañas vigentes: si una alcanza al producto, se muestra el precio con descuento
  promos?: PublicPromo[];
  onOpen: (p: PublicProduct) => void;
}) {
  const strip = useSnapStrip(p.photos.length);
  const pct = discountPercent(p.price, p.compare_price);
  const promo = productPromo(p, promos, new Date());
  // precio nuevo directo solo si la campaña aplica tal cual (sin mínimos)
  const promoPrice = promo && promo.price !== null && !promo.condition ? promo.price : null;
  const out = isOutOfStock(p.stock);
  const low = out ? null : stockLabel(p.stock);
  const lowDetail = stockDetail(p.stock);
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
              <FitPhoto
                key={f}
                src={thumbUrl(f)}
                alt={i === 0 ? p.name : `${p.name} (foto ${i + 1})`}
                loading="lazy"
              />
            ))}
          </div>
        )}

        {promoPrice !== null ? (
          <span className="badge off">{`-${promo!.percent}%`}</span>
        ) : (
          pct !== null && <span className="badge off">{`-${pct}%`}</span>
        )}
        {low && (
          // Con el mouse encima muestra cuántas quedan; el clic abre el producto como
          // el resto de la tarjeta (en el celular la cantidad se ve en la ficha)
          <button type="button" className="badge low" onClick={open} tabIndex={-1}>
            {low}
            {lowDetail && <span className="tip">{lowDetail}</span>}
          </button>
        )}
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
          {promoPrice !== null ? (
            <>
              <s>{money(p.price)}</s>
              {money(promoPrice)}
            </>
          ) : (
            <>
              {pct !== null && p.compare_price !== null && <s>{money(p.compare_price)}</s>}
              {money(p.price)}
            </>
          )}
        </span>
        {promo && <span className="promo-line">{productPromoText(promo)}</span>}
      </button>
    </article>
  );
}
