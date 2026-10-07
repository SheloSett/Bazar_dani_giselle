'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { PublicProduct, Settings } from '@/lib/data';
import { CUSTOMER_NAME_MAX, checkCustomerPhone, parseCustomerName } from '@/lib/validate';
import { applyPromos, type PublicPromo } from '@/lib/promos';
import {
  discountPercent,
  isOutOfStock,
  matchesSearch,
  maxQuantity,
  money,
  photoUrl,
  PUBLIC_STOCK_CAP,
  stockDetail,
  thumbUrl,
  unavailableNotice,
} from '@/lib/catalog';
import { Brand } from '@/components/Brand';
import { ProductCard } from '@/components/ProductCard';
import { Gallery } from '@/components/Gallery';
import { Hero, Perks, PromoStrip } from '@/components/Hero';
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
// Nombre de cada producto del carrito, para poder avisar cuál ya no está si se oculta
// o se borra del catálogo mientras la persona no hizo el pedido
const CART_NAMES_KEY = 'catalogo-cart-nombres';
// Nombre y teléfono de quien pide: se recuerdan en este navegador para el próximo pedido
const CUSTOMER_KEY = 'catalogo-cliente';

// Qué panel quedó abierto, guardado en la entrada del historial (ver openProduct)
type SheetState = { product: number | null; cart: boolean };
const sheetsIn = (state: unknown): SheetState => {
  const s = (state as { sheets?: Partial<SheetState> } | null)?.sheets;
  return { product: s?.product ?? null, cart: !!s?.cart };
};
const pushSheets = (sheets: SheetState) =>
  window.history.pushState({ ...window.history.state, sheets }, '');
// Último código de pedido con la firma de su contenido: el mismo carrito con los
// mismos datos reusa el mismo código, incluso después de recargar la página
const ORDER_TOKEN_KEY = 'catalogo-pedido-token';
// Código del cupón aplicado, para no tener que escribirlo de nuevo
const COUPON_KEY = 'catalogo-cupon';

type Cart = Record<number, number>; // product id -> cantidad
type CartNames = Record<number, string>; // product id -> nombre

function readStore<T extends object>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function writeStore(key: string, value: object) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: el carrito vive solo en memoria */
  }
}

// Código del link del pedido: 12 bytes al azar en base64url (imposible de adivinar).
// getRandomValues funciona también sin HTTPS, a diferencia de randomUUID.
function newOrderToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const persistCart = (cart: Cart) => writeStore(CART_KEY, cart);
const rememberName = (id: number, name: string) =>
  writeStore(CART_NAMES_KEY, { ...readStore<CartNames>(CART_NAMES_KEY), [id]: name });

export function Catalog({
  products,
  categories,
  categoryPhotos = {},
  settings,
  promos = [],
}: {
  products: PublicProduct[];
  categories: string[];
  categoryPhotos?: Record<string, string>; // nombre de categoría -> foto propia del rubro
  settings: Settings;
  // Promociones automáticas vigentes (los cupones no viajan: se verifican al escribirlos)
  promos?: PublicPromo[];
}) {
  const [cart, setCart] = useState<Cart>({});
  const [category, setCategory] = useState('Todo');
  const [search, setSearch] = useState('');
  const [current, setCurrent] = useState<PublicProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [removedNote, setRemovedNote] = useState(''); // detalle en "Tu pedido"
  // Quién pide: nombre y teléfono, obligatorios para enviar
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [customerErrors, setCustomerErrors] = useState(false);
  // Cupón: lo que escribe la persona y, si el servidor lo reconoció, la promoción
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; promo: PublicPromo } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const customerName = parseCustomerName(customer.name);
  const phoneCheck = checkCustomerPhone(customer.phone);
  const customerPhone = phoneCheck.ok ? phoneCheck.phone : null;

  useEffect(() => {
    const saved = readStore<{ name?: unknown; phone?: unknown }>(CUSTOMER_KEY);
    setCustomer({
      name: typeof saved.name === 'string' ? saved.name : '',
      phone: typeof saved.phone === 'string' ? saved.phone : '',
    });
  }, []);

  const updateCustomer = (patch: Partial<typeof customer>) => {
    const next = { ...customer, ...patch };
    setCustomer(next);
    writeStore(CUSTOMER_KEY, next);
  };

  // Link al detalle con fotos que va en el mensaje. Cada cambio del carrito o de los
  // datos es otro pedido, con otro código; el mismo contenido (aunque se recargue la
  // página) reusa el mismo código: reenviar no crea un pedido repetido y el link del
  // mensaje sigue siendo válido.
  const [orderLink, setOrderLink] = useState<{ token: string; url: string } | null>(null);

  useEffect(() => {
    // Firma del contenido: productos con cantidades + datos de quien pide
    const sig = JSON.stringify({
      items: Object.entries(cart)
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => Number(a) - Number(b)),
      name: customer.name.trim(),
      phone: customer.phone.trim(),
    });
    const saved = readStore<{ sig?: unknown; token?: unknown }>(ORDER_TOKEN_KEY);
    // antes era siempre `const token = newOrderToken()`: generaba un código nuevo
    // en cada carga y el mismo carrito reenviado quedaba como otro pedido
    const token =
      saved.sig === sig && typeof saved.token === 'string' && saved.token
        ? saved.token
        : newOrderToken();
    writeStore(ORDER_TOKEN_KEY, { sig, token });
    setOrderLink({ token, url: `${window.location.origin}/pedido/${token}` });
  }, [cart, customer.name, customer.phone]);

  const showToast = useCallback((text: string, ms = 1800) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), ms);
  }, []);

  // Los paneles (ficha de producto y pedido) entran en el historial del navegador:
  // en el celular, el botón "atrás" cierra el panel en vez de irse de la página.
  // Al abrir uno se agrega una entrada que dice qué quedó abierto; al tocar "atrás"
  // el navegador avisa (popstate) y se muestra lo que diga la entrada a la que
  // volvió. Cerrar con la X, el fondo o Escape hace history.back(), así no queda
  // una entrada colgada que obligue a tocar "atrás" dos veces.
  const openProduct = (p: PublicProduct) => {
    setCurrent(p);
    setQty(1);
    pushSheets({ product: p.id, cart: false });
  };
  const openCart = () => {
    setCartOpen(true);
    pushSheets({ product: null, cart: true });
  };
  const closeSheets = useCallback(() => {
    const open = sheetsIn(window.history.state);
    if (open.product !== null || open.cart) window.history.back();
    else {
      setCurrent(null);
      setCartOpen(false);
    }
  }, []);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = sheetsIn(e.state);
      setCurrent(s.product === null ? null : (products.find((p) => p.id === s.product) ?? null));
      setCartOpen(s.cart);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [products]);

  // Con un panel abierto (ficha o pedido): Escape lo cierra y la página de atrás no
  // se desliza
  const sheetOpen = current !== null || cartOpen;
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closeSheets();
    };
    document.addEventListener('keydown', onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = before;
    };
  }, [sheetOpen, closeSheets]);

  // Carga el carrito guardado. Si algún producto ya no está en el catálogo (se ocultó o
  // se borró desde el panel), lo saca y avisa, en vez de hacerlo desaparecer en silencio.
  useEffect(() => {
    const saved = readStore<Cart>(CART_KEY);
    const names = readStore<CartNames>(CART_NAMES_KEY);
    const ids = Object.keys(saved).map(Number);
    const gone = ids.filter((id) => !products.some((p) => p.id === id));
    if (gone.length) {
      for (const id of gone) delete saved[id];
      persistCart(saved);
      const known = gone.map((id) => names[id]).filter((n): n is string => !!n);
      setRemovedNote(unavailableNotice(known, gone.length - known.length) ?? '');
      showToast(
        gone.length === 1
          ? '1 producto de tu pedido ya no está disponible'
          : `${gone.length} productos de tu pedido ya no están disponibles`,
        5000
      );
    }
    // Nombres al día solo de lo que queda (completa los de carritos guardados antes)
    const fresh: CartNames = {};
    for (const p of products) if (saved[p.id]) fresh[p.id] = p.name;
    writeStore(CART_NAMES_KEY, fresh);
    setCart(saved);
  }, [products, showToast]);

  // El cupón que quedó aplicado la vez anterior se vuelve a verificar (puede haber vencido)
  useEffect(() => {
    const saved = readStore<{ code?: unknown }>(COUPON_KEY);
    if (typeof saved.code !== 'string' || !saved.code) return;
    let cancelled = false;
    fetch('/api/promos/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: saved.code }),
    })
      .then(async (res) => ({ ok: res.ok, data: (await res.json()) as { promo?: PublicPromo } }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && data.promo?.code) setCoupon({ code: data.promo.code, promo: data.promo });
        else writeStore(COUPON_KEY, {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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

  // Tapa de cada rubro: su foto propia (se carga en el panel) o la del primer producto que tenga
  const tiles = useMemo(
    () =>
      tabs.slice(1).map((c) => {
        const inCat = products.filter((p) => p.category === c);
        const cover = categoryPhotos[c] ?? inCat.find((p) => p.photos.length > 0)?.photos[0];
        return { name: c, count: inCat.length, photo: cover ? thumbUrl(cover) : null };
      }),
    [tabs, products, categoryPhotos]
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
  const subtotal = items.reduce((s, x) => s + x.n * x.p.price, 0);
  // Promociones automáticas y el cupón aplicado: el total es lo que queda a pagar
  const pricing = useMemo(
    () =>
      applyPromos(
        items.map((x) => ({
          product_id: x.p.id,
          category_id: x.p.category_id,
          price: x.p.price,
          quantity: x.n,
        })),
        coupon ? [...promos, coupon.promo] : promos,
        { code: coupon?.code ?? null, now: new Date() }
      ),
    [items, promos, coupon]
  );
  const total = pricing.total;

  // Cupón: lo verifica el servidor (los códigos no viajan al navegador) y devuelve
  // la promoción, así el descuento se recalcula acá si el pedido cambia
  const verifyCoupon = async (code: string) => {
    setCouponBusy(true);
    setCouponError('');
    try {
      const res = await fetch('/api/promos/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as {
        promo?: PublicPromo;
        error?: string;
      } | null;
      if (res.ok && data?.promo?.code) {
        setCoupon({ code: data.promo.code, promo: data.promo });
        setCouponInput('');
        writeStore(COUPON_KEY, { code: data.promo.code });
      } else {
        setCouponError(data?.error || 'No pudimos verificar el cupón. Probá de nuevo.');
      }
    } catch {
      setCouponError('No pudimos verificar el cupón. Probá de nuevo.');
    }
    setCouponBusy(false);
  };
  const removeCoupon = () => {
    setCoupon(null);
    setCouponError('');
    writeStore(COUPON_KEY, {});
  };

  const orderMessage = () => {
    const lines = items
      .map(
        (x) =>
          `- ${x.n} x ${x.p.name} — ${money(x.p.price)} c/u` +
          (isOutOfStock(x.p.stock) ? ' (sin stock, a confirmar)' : '')
      )
      .join('\n');
    const hello = customerName ? `Hola, soy ${customerName}.` : 'Hola.';
    const phone = customer.phone.trim() ? `\nMi teléfono: ${customer.phone.trim()}` : '';
    const link = orderLink ? `\nVer pedido con fotos: ${orderLink.url}` : '';
    const discounts = pricing.lines
      .map((l) => `- ${l.code ? `Cupón ${l.code}` : l.name}: -${money(l.amount)}`)
      .join('\n');
    const totals = discounts
      ? `Subtotal: ${money(subtotal)}\n${discounts}\nTotal estimado: ${money(total)}`
      : `Total estimado: ${money(total)}`;
    return `${hello} Les paso mi pedido desde el catálogo:\n${lines}\n${totals}${phone}${link}\n¿Me confirman cotización y entrega?`;
  };

  // Guarda el pedido: así queda en el panel y el link del mensaje funciona. Sale al
  // tocar "Enviar", sin frenar la apertura de WhatsApp. Si falla, avisa: el mensaje
  // igual lleva todo el detalle.
  const saveOrder = () => {
    if (!orderLink) return;
    const failed = () =>
      showToast('No pudimos registrar el pedido. Envialo igual por WhatsApp.', 6000);
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        token: orderLink.token,
        items: items.map((x) => ({ id: x.p.id, quantity: x.n })),
        customer: { name: customer.name, phone: customer.phone },
        coupon: coupon?.code ?? null,
      }),
    })
      .then(async (res) => {
        if (res.ok) return;
        const data = (await res.json().catch(() => null)) as { coupon?: string } | null;
        if (data?.coupon === 'invalid') {
          // El cupón dejó de valer entre que se aplicó y se envió: se saca y se avisa
          removeCoupon();
          showToast('El cupón ya no es válido. Lo sacamos del pedido: volvé a tocar Enviar.', 7000);
        } else failed();
      })
      .catch(failed);
  };

  // Sin nombre y teléfono no se envía: marca lo que falta y lleva el cursor ahí
  const sendOrder = (e: MouseEvent) => {
    if (!customerName || !customerPhone) {
      e.preventDefault();
      setCustomerErrors(true);
      document.getElementById(customerName ? 'cliente-tel' : 'cliente-nombre')?.focus();
      return;
    }
    saveOrder();
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

  const addToCart = () => {
    if (!current) return;
    const have = cart[current.id] || 0;
    // Nunca más unidades que las disponibles
    const next = Math.min(maxQuantity(current.stock), have + qty);
    if (next <= have) {
      // Al público no le llega el stock exacto por encima del tope: ahí puede haber más
      showToast(
        current.stock !== null && current.stock >= PUBLIC_STOCK_CAP
          ? `Para pedir más de ${PUBLIC_STOCK_CAP} unidades, consultanos por WhatsApp`
          : 'No hay más unidades disponibles',
        3500
      );
      return;
    }
    updateCart({ ...cart, [current.id]: next });
    rememberName(current.id, current.name);
    showToast(`Agregado: ${current.name} × ${next - have}`);
    closeSheets();
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
  // En la ficha va la cantidad exacta ("Quedan 3 unidades"), no la etiqueta corta
  const currentStock = current
    ? currentOut
      ? 'Sin stock por el momento'
      : stockDetail(current.stock)
    : null;
  const currentMax = current ? maxQuantity(current.stock) : Infinity;

  return (
    <>
      <header className="site-header">
        <div className="header-in">
          <Brand name={settings.shop_name} logo={settings.logo} withName={settings.logo_with_name} />
          <button
            className="btn-cart"
            onClick={openCart}
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
      <Perks settings={settings} />
      <PromoStrip promos={promos} products={products} />
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
          <button onClick={openCart}>
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
          onClick={(e) => e.target === e.currentTarget && closeSheets()}
        >
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Detalle del producto">
            <button className="close" onClick={closeSheets} aria-label="Cerrar">
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
                {currentStock}
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
          onClick={(e) => e.target === e.currentTarget && closeSheets()}
        >
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Tu pedido">
            <button className="close" onClick={closeSheets} aria-label="Cerrar">
              <IconClose />
            </button>
            <h2>Tu pedido</h2>
            {removedNote && (
              <p className="cart-note" role="status">
                {removedNote}
              </p>
            )}
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
                {pricing.lines.length > 0 && (
                  <div className="disc">
                    <div className="disc-row">
                      <span>Subtotal</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    {pricing.lines.map((l) => (
                      <div className="disc-row off" key={l.promo_id}>
                        <span>{l.code ? `Cupón ${l.code}` : l.name}</span>
                        <span>{`−${money(l.amount)}`}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="total">
                  <span>Total estimado</span>
                  <span className="v">{money(total)}</span>
                </div>
                <div className="coupon">
                  {coupon ? (
                    <p className="coupon-on">
                      <span>
                        Cupón <strong>{coupon.code}</strong> aplicado
                        {pricing.couponNote && (
                          <span className="warn">{` · ${pricing.couponNote}`}</span>
                        )}
                      </span>
                      <button type="button" className="btn-ghost" onClick={removeCoupon}>
                        Quitar
                      </button>
                    </p>
                  ) : (
                    <form
                      className="coupon-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (couponInput.trim() && !couponBusy) verifyCoupon(couponInput);
                      }}
                    >
                      <input
                        id="cupon"
                        aria-label="Cupón de descuento"
                        placeholder="¿Tenés un cupón?"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        maxLength={20}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <button
                        type="submit"
                        className="btn-sm"
                        disabled={couponBusy || !couponInput.trim()}
                      >
                        {couponBusy ? 'Verificando…' : 'Aplicar'}
                      </button>
                    </form>
                  )}
                  {couponError && (
                    <p className="who-err" role="alert">
                      {couponError}
                    </p>
                  )}
                </div>
                <div className="who">
                  <p className="pv-label">Tus datos, para coordinar el pedido:</p>
                  <div className="who-row">
                    <label>
                      Nombre y apellido
                      <input
                        id="cliente-nombre"
                        autoComplete="name"
                        maxLength={CUSTOMER_NAME_MAX}
                        value={customer.name}
                        onChange={(e) => updateCustomer({ name: e.target.value })}
                        aria-invalid={customerErrors && !customerName}
                      />
                    </label>
                    <label>
                      Teléfono
                      <input
                        id="cliente-tel"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={40}
                        placeholder="11 2345-6789"
                        value={customer.phone}
                        onChange={(e) => updateCustomer({ phone: e.target.value })}
                        aria-invalid={customerErrors && !customerPhone}
                      />
                    </label>
                  </div>
                  {customerErrors && (!customerName || !customerPhone) && (
                    <p className="who-err" role="alert">
                      {!customerName
                        ? 'Escribí tu nombre para enviar el pedido.'
                        : !phoneCheck.ok && phoneCheck.error === 'inventado'
                          ? 'Ese teléfono no parece real. Poné el tuyo: lo usamos para coordinar el pedido.'
                          : 'Escribí tu teléfono completo, con código de área. Por ejemplo: 11 2345-6789.'}
                    </p>
                  )}
                </div>
                <p className="pv-label">Así llega el mensaje al negocio:</p>
                <div className="preview">{orderMessage()}</div>
                {/* se abren en otra pestaña para no perder el pedido que se está armando */}
                <p className="who-legal">
                  Al enviar el pedido aceptás los{' '}
                  <a href="/terminos" target="_blank" rel="noopener">
                    Términos y condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener">
                    Política de privacidad
                  </a>
                  .
                </p>
                <div className="actions">
                  <a
                    className="btn btn-wa"
                    target="_blank"
                    rel="noopener"
                    href={waLink(orderMessage())}
                    onClick={sendOrder}
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
