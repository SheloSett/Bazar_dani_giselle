'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicProduct, Settings } from '@/lib/data';
import {
  discountPercent,
  isOutOfStock,
  matchesSearch,
  maxQuantity,
  money,
  photoUrl,
  stockLabel,
  thumbUrl,
} from '@/lib/catalog';
import { ProductCard } from '@/components/ProductCard';
import { Gallery } from '@/components/Gallery';
import { Hero, Perks } from '@/components/Hero';
import { CategoryTiles } from '@/components/CategoryTiles';
import { SiteFooter, WhatsAppFab } from '@/components/SiteFooter';
import {
  IconBasket,
  IconClose,
  IconMinus,
  IconPlus,
  IconSearch,
  IconWhatsApp,
} from '@/components/icons';

const CART_KEY = 'catalogo-cart';

type Cart = Record<number, number>; // product id -> cantidad

function loadCart(): Cart {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as Cart) : {};
  } catch {
    return {};
  }
}

function persistCart(cart: Cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* almacenamiento no disponible: el carrito vive solo en memoria */
  }
}

export function Catalog({
  products,
  categories,
  settings,
}: {
  products: PublicProduct[];
  categories: string[];
  settings: Settings;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [category, setCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [current, setCurrent] = useState<PublicProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  const updateCart = (next: Cart) => {
    setCart(next);
    persistCart(next);
  };

  const stockOf = (id: number) => products.find((x) => x.id === id)?.stock ?? null;

  const tabs = useMemo(
    () => ['Todo', ...categories.filter((c) => products.some((p) => p.category === c))],
    [categories, products]
  );

  // Tapa de cada rubro: la foto del primer producto que tenga
  const tiles = useMemo(
    () =>
      tabs.slice(1).map((c) => {
        const inCat = products.filter((p) => p.category === c);
        const cover = inCat.find((p) => p.photos.length > 0);
        return { name: c, count: inCat.length, photo: cover ? thumbUrl(cover.photos[0]) : null };
      }),
    [tabs, products]
  );

  // Collage de la portada: hasta 3 fotos, una por rubro y distintas de las tapas
  // de los rubros (si no alcanzan, se repiten)
  const heroPhotos = useMemo(() => {
    const covers = new Set(tiles.map((t) => t.photo));
    const withPhoto = products.filter((p) => p.photos.length > 0);
    const fresh = withPhoto.filter((p) => !covers.has(thumbUrl(p.photos[0])));
    const picked: PublicProduct[] = [];
    for (const t of tiles) {
      const p = fresh.find((x) => x.category === t.name);
      if (p) picked.push(p);
    }
    for (const p of [...fresh, ...withPhoto]) if (!picked.includes(p)) picked.push(p);
    // La primera se ve grande: va la foto completa; las otras, la miniatura
    return picked.slice(0, 3).map((p, i) => (i === 0 ? photoUrl : thumbUrl)(p.photos[0]));
  }, [tiles, products]);

  const stats =
    `${products.length} ${products.length === 1 ? 'producto' : 'productos'}` +
    (tiles.length > 1 ? ` · ${tiles.length} rubros` : '');

  const list = useMemo(
    () =>
      products.filter(
        (p) => (category === 'Todo' || p.category === category) && matchesSearch(p, search)
      ),
    [products, category, search]
  );

  const items = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, n]) => ({ p: products.find((x) => x.id === Number(id)), n }))
        .filter((x): x is { p: PublicProduct; n: number } => !!x.p && x.n > 0),
    [cart, products]
  );
  const count = items.reduce((s, x) => s + x.n, 0);
  const total = items.reduce((s, x) => s + x.n * x.p.price, 0);

  const orderMessage = () => {
    const lines = items
      .map(
        (x) =>
          `- ${x.n} x ${x.p.name} — ${money(x.p.price)} c/u` +
          (isOutOfStock(x.p.stock) ? ' (sin stock, a confirmar)' : '')
      )
      .join('\n');
    return `Hola, les paso mi pedido desde el catálogo:\n${lines}\nTotal estimado: ${money(total)}\n¿Me confirman cotización y entrega?`;
  };

  const waLink = (text: string) =>
    `https://wa.me/${settings.whatsapp_phone}?text=${encodeURIComponent(text)}`;

  // Consulta general (portada, pie y botón flotante): solo si hay número cargado
  const waGeneral = settings.whatsapp_phone
    ? waLink('Hola, quería hacer una consulta.')
    : null;

  // Baja hasta la grilla de productos
  const browse = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('productos')
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const pickCategory = (c: string) => {
    setCategory(c);
    browse();
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };

  const openProduct = (p: PublicProduct) => {
    setCurrent(p);
    setQty(1);
  };

  const addToCart = () => {
    if (!current) return;
    const have = cart[current.id] || 0;
    // Nunca más unidades que las disponibles
    const next = Math.min(maxQuantity(current.stock), have + qty);
    if (next <= have) {
      showToast('No hay más unidades disponibles');
      return;
    }
    updateCart({ ...cart, [current.id]: next });
    showToast(`Agregado: ${current.name} × ${next - have}`);
    setCurrent(null);
  };

  const changeQty = (id: number, delta: number) => {
    const n = (cart[id] || 0) + delta;
    if (delta > 0 && n > maxQuantity(stockOf(id))) return;
    const next = { ...cart };
    if (n < 1) delete next[id];
    else next[id] = n;
    updateCart(next);
  };

  // Datos derivados del producto abierto en la ficha
  const currentPct = current ? discountPercent(current.price, current.compare_price) : null;
  const currentOut = current ? isOutOfStock(current.stock) : false;
  const currentStock = current ? stockLabel(current.stock) : null;
  const currentMax = current ? maxQuantity(current.stock) : Infinity;

  return (
    <>
      <header className="site-header">
        <div className="header-in">
          <span className="brand">{settings.shop_name}</span>
          <button
            className="btn-cart"
            onClick={() => setCartOpen(true)}
            aria-label="Ver pedido"
          >
            <IconBasket /> Pedido <span className="n">{count}</span>
          </button>
        </div>
      </header>

      <Hero
        settings={settings}
        stats={stats}
        photos={heroPhotos}
        waHref={waGeneral}
        onBrowse={browse}
      />
      <Perks />
      <CategoryTiles tiles={tiles} active={category} onPick={pickCategory} />

      <section className="tools">
        <div className="sec-head" id="productos">
          <h2 className="sec-t">{category === 'Todo' ? 'Todos los productos' : category}</h2>
          <span className="sec-n">
            {list.length} {list.length === 1 ? 'producto' : 'productos'}
          </span>
        </div>
        <div className="search">
          <IconSearch />
          <input
            id="q"
            type="search"
            placeholder="Buscar en el catálogo"
            aria-label="Buscar en el catálogo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tabs.length > 1 && (
          <div className="tabs" role="group" aria-label="Rubros">
            {tabs.map((c) => (
              <button
                key={c}
                aria-pressed={c === category}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="catalog-main">
        <div className="grid">
          {list.length === 0 && (
            <p className="empty">
              No encontramos productos con esa búsqueda. Probá con otra palabra.
            </p>
          )}
          {list.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={openProduct} />
          ))}
        </div>
      </main>

      <SiteFooter
        settings={settings}
        categories={tabs.slice(1)}
        waHref={waGeneral}
        withBar={count > 0}
        onPick={pickCategory}
      />

      {waGeneral && <WhatsAppFab href={waGeneral} raised={count > 0} />}

      {count > 0 && (
        <div className="order-bar">
          <button onClick={() => setCartOpen(true)}>
            <span>
              Ver pedido — {count} {count === 1 ? 'producto' : 'productos'}
            </span>
            <span className="tot">{money(total)}</span>
          </button>
        </div>
      )}

      {current && (
        <div
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setCurrent(null)}
        >
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Detalle del producto">
            <button className="close" onClick={() => setCurrent(null)} aria-label="Cerrar">
              <IconClose />
            </button>
            {current.category && <span className="cat">{current.category}</span>}
            <h2>{current.name}</h2>
            <Gallery photos={current.photos} alt={current.name} />
            <div className="price">
              {currentPct !== null && current.compare_price !== null ? (
                <>
                  <s>{money(current.compare_price)}</s> {money(current.price)}
                  <span className="pct">{`-${currentPct}%`}</span>
                </>
              ) : (
                money(current.price)
              )}{' '}
              <small>por unidad</small>
            </div>
            {currentStock && (
              <p className={currentOut ? 'stock-note out' : 'stock-note'}>
                {currentOut ? 'Sin stock por el momento' : currentStock}
              </p>
            )}
            {current.description && <p className="desc">{current.description}</p>}
            {!currentOut && (
              <div className="qty">
                <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Restar uno">
                  <IconMinus />
                </button>
                <output>{qty}</output>
                <button
                  onClick={() => setQty(Math.min(currentMax, qty + 1))}
                  disabled={qty >= currentMax}
                  aria-label="Sumar uno"
                >
                  <IconPlus />
                </button>
              </div>
            )}
            <div className="actions">
              <button className="btn btn-primary" onClick={addToCart} disabled={currentOut}>
                {currentOut ? 'Sin stock' : 'Agregar al pedido'}
              </button>
              <a
                className="btn btn-ghost"
                target="_blank"
                rel="noopener"
                href={waLink(
                  currentOut
                    ? `Hola, quería saber si vuelve a haber: ${current.name}.`
                    : `Hola, quería consultar por: ${current.name} (${money(current.price)}).`
                )}
              >
                {currentOut ? 'Consultar disponibilidad' : 'Consultar solo este producto'}
              </a>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}
        >
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Tu pedido">
            <button className="close" onClick={() => setCartOpen(false)} aria-label="Cerrar">
              <IconClose />
            </button>
            <h2>Tu pedido</h2>
            <div className="lines">
              {items.length === 0 && (
                <p className="empty">Tu pedido está vacío. Tocá un producto para sumarlo.</p>
              )}
              {items.map((x) => (
                <div className="line" key={x.p.id}>
                  <div className="nm">
                    {x.p.name}
                    <small>
                      {money(x.p.price)} c/u
                      {isOutOfStock(x.p.stock) && (
                        <span className="warn"> · sin stock, a confirmar</span>
                      )}
                    </small>
                  </div>
                  <div className="st">
                    <button onClick={() => changeQty(x.p.id, -1)} aria-label="Restar">
                      <IconMinus />
                    </button>
                    <output>{x.n}</output>
                    <button
                      onClick={() => changeQty(x.p.id, 1)}
                      disabled={x.n >= maxQuantity(x.p.stock)}
                      aria-label="Sumar"
                    >
                      <IconPlus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <>
                <div className="total">
                  <span>Total estimado</span>
                  <span className="v">{money(total)}</span>
                </div>
                <p className="pv-label">Así llega el mensaje al negocio:</p>
                <div className="preview">{orderMessage()}</div>
                <div className="actions">
                  <a
                    className="btn btn-wa"
                    target="_blank"
                    rel="noopener"
                    href={waLink(orderMessage())}
                  >
                    <IconWhatsApp /> Enviar pedido por WhatsApp
                  </a>
                  <button className="btn btn-ghost" onClick={() => updateCart({})}>
                    Vaciar pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
