'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicProduct, Settings } from '@/lib/data';
import {
  IconBasket,
  IconClose,
  IconMinus,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconWhatsApp,
} from '@/components/icons';

const CART_KEY = 'catalogo-cart';

type Cart = Record<number, number>; // product id -> cantidad

const money = (n: number) => '$ ' + n.toLocaleString('es-AR');

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

  const tabs = useMemo(
    () => ['Todo', ...categories.filter((c) => products.some((p) => p.category === c))],
    [categories, products]
  );

  const list = useMemo(() => {
    const t = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === 'Todo' || p.category === category) &&
        (!t || (p.name + ' ' + p.description).toLowerCase().includes(t))
    );
  }, [products, category, search]);

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
      .map((x) => `- ${x.n} x ${x.p.name} — ${money(x.p.price)} c/u`)
      .join('\n');
    return `Hola, les paso mi pedido desde el catálogo:\n${lines}\nTotal estimado: ${money(total)}\n¿Me confirman cotización y entrega?`;
  };

  const waLink = (text: string) =>
    `https://wa.me/${settings.whatsapp_phone}?text=${encodeURIComponent(text)}`;

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
    updateCart({ ...cart, [current.id]: (cart[current.id] || 0) + qty });
    showToast(`Agregado: ${current.name} × ${qty}`);
    setCurrent(null);
  };

  const changeQty = (id: number, delta: number) => {
    const next = { ...cart, [id]: (cart[id] || 0) + delta };
    if (next[id] < 1) delete next[id];
    updateCart(next);
  };

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

      {(settings.tagline || settings.footer_note) && (
        <section className="intro">
          {settings.tagline && <h1>{settings.tagline}</h1>}
          {settings.footer_note && <p>{settings.footer_note}</p>}
        </section>
      )}

      <section className="tools">
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
            <button key={p.id} className="item" onClick={() => openProduct(p)}>
              <span className="ph">
                {p.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/uploads/${p.photos[0]}`} alt={p.name} loading="lazy" />
                ) : (
                  <IconPhoto />
                )}
              </span>
              <span className="name">{p.name}</span>
              <span className="price">{money(p.price)}</span>
            </button>
          ))}
        </div>
      </main>

      <footer className="site-footer">
        <p>{settings.shop_name} — Pedidos por WhatsApp.</p>
      </footer>

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
            <div className="gallery">
              {current.photos.length === 0 && (
                <div className="shot">
                  <IconPhoto />
                </div>
              )}
              {current.photos.map((f) => (
                <div className="shot" key={f}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/uploads/${f}`} alt={current.name} />
                </div>
              ))}
            </div>
            <div className="price">
              {money(current.price)} <small>por unidad</small>
            </div>
            {current.description && <p className="desc">{current.description}</p>}
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Restar uno">
                <IconMinus />
              </button>
              <output>{qty}</output>
              <button onClick={() => setQty(qty + 1)} aria-label="Sumar uno">
                <IconPlus />
              </button>
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={addToCart}>
                Agregar al pedido
              </button>
              <a
                className="btn btn-ghost"
                target="_blank"
                rel="noopener"
                href={waLink(
                  `Hola, quería consultar por: ${current.name} (${money(current.price)}).`
                )}
              >
                Consultar solo este producto
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
                    <small>{money(x.p.price)} c/u</small>
                  </div>
                  <div className="st">
                    <button onClick={() => changeQty(x.p.id, -1)} aria-label="Restar">
                      <IconMinus />
                    </button>
                    <output>{x.n}</output>
                    <button onClick={() => changeQty(x.p.id, 1)} aria-label="Sumar">
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
