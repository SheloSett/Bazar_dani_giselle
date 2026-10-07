'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { AdminPromo } from '@/lib/promos-data';
import {
  PROMO_NAME_MAX,
  promoInputDate,
  promoStatus,
  promoSummary,
  type PromoKind,
  type PromoScope,
  type PromoStatus,
} from '@/lib/promos';

type Option = { id: number; name: string };

// El formulario trabaja con textos; el servidor valida y convierte (parsePromoInput)
interface Form {
  name: string;
  isCoupon: boolean;
  code: string;
  kind: PromoKind;
  value: string;
  scope: PromoScope;
  category_id: string;
  product_id: string;
  min_quantity: string;
  min_total: string;
  starts_at: string;
  ends_at: string;
  max_uses: string;
  active: boolean;
}

const EMPTY: Form = {
  name: '',
  isCoupon: false,
  code: '',
  kind: 'percent',
  value: '',
  scope: 'all',
  category_id: '',
  product_id: '',
  min_quantity: '1',
  min_total: '',
  starts_at: '',
  ends_at: '',
  max_uses: '',
  active: true,
};

const toForm = (p: AdminPromo): Form => ({
  name: p.name,
  isCoupon: p.code !== null,
  code: p.code ?? '',
  kind: p.kind,
  value: String(p.value),
  scope: p.scope,
  category_id: p.category_id ? String(p.category_id) : '',
  product_id: p.product_id ? String(p.product_id) : '',
  min_quantity: String(p.min_quantity),
  min_total: p.min_total ? String(p.min_total) : '',
  starts_at: promoInputDate(p.starts_at),
  ends_at: promoInputDate(p.ends_at),
  max_uses: p.max_uses ? String(p.max_uses) : '',
  active: p.active,
});

const STATUS_LABEL: Record<PromoStatus, string> = {
  activa: 'Activa',
  pausada: 'Pausada',
  programada: 'Programada',
  vencida: 'Vencida',
  agotada: 'Agotada',
};
const STATUS_CLASS: Record<PromoStatus, string> = {
  activa: 'pill on',
  pausada: 'pill',
  programada: 'pill soon',
  vencida: 'pill out',
  agotada: 'pill out',
};

// Promociones automáticas y cupones: alta, edición, pausa y borrado
export function PromoManager({
  initial,
  categories,
  products,
}: {
  initial: AdminPromo[];
  categories: Option[];
  products: Option[];
}) {
  const router = useRouter();
  const [promos, setPromos] = useState(initial);
  const [form, setForm] = useState<Form | null>(null); // null = formulario cerrado
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const now = new Date();

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const startNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOk('');
  };
  const startEdit = (p: AdminPromo) => {
    setEditing(p.id);
    setForm(toForm(p));
    setError('');
    setOk('');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const cancel = () => {
    setForm(null);
    setEditing(null);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || busy) return;
    setBusy(true);
    setError('');
    setOk('');
    const body = {
      name: form.name,
      code: form.isCoupon ? form.code : '',
      kind: form.kind,
      value: form.value,
      scope: form.scope,
      category_id: form.scope === 'category' ? form.category_id : '',
      product_id: form.scope === 'product' ? form.product_id : '',
      min_quantity: form.min_quantity,
      min_total: form.min_total,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      max_uses: form.isCoupon ? form.max_uses : '',
      active: form.active,
    };
    const res = await fetch(editing ? `/api/admin/promos/${editing}` : '/api/admin/promos', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as (AdminPromo & { error?: string }) | null;
    setBusy(false);
    if (!res.ok || !data || data.error) {
      setError(data?.error || 'No se pudo guardar la promoción.');
      return;
    }
    setPromos((list) =>
      editing ? list.map((p) => (p.id === data.id ? data : p)) : [data, ...list]
    );
    setOk(editing ? 'Promoción guardada.' : 'Promoción creada.');
    setForm(null);
    setEditing(null);
    router.refresh();
  };

  const toggle = async (p: AdminPromo) => {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/admin/promos/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    const data = (await res.json().catch(() => null)) as AdminPromo | null;
    setBusy(false);
    if (res.ok && data) {
      setPromos((list) => list.map((x) => (x.id === p.id ? data : x)));
      router.refresh();
    }
  };

  const remove = async (p: AdminPromo) => {
    if (busy || !confirm(`¿Borrar "${p.name}"? Los pedidos que ya la usaron no cambian.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/promos/${p.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setPromos((list) => list.filter((x) => x.id !== p.id));
      if (editing === p.id) cancel();
      router.refresh();
    }
  };

  return (
    <>
      <div className="adm-top">
        <h1>Promociones</h1>
        {!form && (
          <button type="button" className="btn-sm" onClick={startNew}>
            Nueva promoción
          </button>
        )}
      </div>
      <p className="section-note">
        Una <strong>campaña</strong> aplica sola cuando el pedido cumple sus condiciones (si
        hay varias, la que más descuenta) y se anuncia en la portada del catálogo, con el
        precio rebajado en cada producto alcanzado. Un <strong>cupón</strong> es igual, pero
        solo aplica si la persona escribe su código al armar el pedido, y se suma a la
        campaña. Los productos con <strong>precio anterior</strong> cargado (oferta propia)
        quedan afuera: nunca se suman dos descuentos sobre lo mismo.
      </p>

      {ok && <div className="msg-ok">{ok}</div>}

      {form && (
        <form ref={formRef} className="promo-form" onSubmit={save}>
          <section className="adm-card">
            <h2 className="card-t">{editing ? 'Editar promoción' : 'Nueva promoción'}</h2>
            <div className="fld">
              <label htmlFor="pr-name">Nombre</label>
              <input
                id="pr-name"
                value={form.name}
                maxLength={PROMO_NAME_MAX}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Semana del hogar"
                required
              />
              <span className="hint">Lo ve el cliente en el pedido y en el catálogo.</span>
            </div>
            <div className="fld-row">
              <label className="check">
                <input
                  type="radio"
                  name="pr-type"
                  checked={!form.isCoupon}
                  onChange={() => set({ isCoupon: false })}
                />
                Campaña (aplica sola)
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="pr-type"
                  checked={form.isCoupon}
                  onChange={() => set({ isCoupon: true })}
                />
                Cupón con código
              </label>
            </div>
            {form.isCoupon && (
              <div className="fld-row">
                <div className="fld">
                  <label htmlFor="pr-code">Código</label>
                  <input
                    id="pr-code"
                    value={form.code}
                    onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                    placeholder="HOGAR10"
                    maxLength={20}
                    autoCapitalize="characters"
                    spellCheck={false}
                    required
                  />
                  <span className="hint">Letras, números o guiones, de 3 a 20.</span>
                </div>
                <div className="fld">
                  <label htmlFor="pr-uses">Máximo de usos</label>
                  <input
                    id="pr-uses"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={form.max_uses}
                    onChange={(e) => set({ max_uses: e.target.value })}
                    placeholder="Sin límite"
                  />
                  <span className="hint">Cuántos pedidos pueden usarlo. Vacío: sin límite.</span>
                </div>
              </div>
            )}
          </section>

          <section className="adm-card">
            <h2 className="card-t">Descuento</h2>
            <div className="fld-row">
              <div className="fld">
                <label htmlFor="pr-kind">Tipo</label>
                <select
                  id="pr-kind"
                  value={form.kind}
                  onChange={(e) => set({ kind: e.target.value as PromoKind })}
                >
                  <option value="percent">Porcentaje</option>
                  <option value="amount">Pesos</option>
                </select>
              </div>
              <div className="fld">
                <label htmlFor="pr-value">{form.kind === 'percent' ? 'Porcentaje' : 'Importe'}</label>
                <div className="in-pre">
                  <span>{form.kind === 'percent' ? '%' : '$'}</span>
                  <input
                    id="pr-value"
                    type="number"
                    min={1}
                    max={form.kind === 'percent' ? 100 : undefined}
                    step={1}
                    inputMode="numeric"
                    value={form.value}
                    onChange={(e) => set({ value: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="fld-row">
              <div className="fld">
                <label htmlFor="pr-scope">Aplica a</label>
                <select
                  id="pr-scope"
                  value={form.scope}
                  onChange={(e) => set({ scope: e.target.value as PromoScope })}
                >
                  <option value="all">Todo el pedido</option>
                  <option value="category">Un rubro</option>
                  <option value="product">Un producto</option>
                </select>
              </div>
              {form.scope === 'category' && (
                <div className="fld">
                  <label htmlFor="pr-cat">Rubro</label>
                  <select
                    id="pr-cat"
                    value={form.category_id}
                    onChange={(e) => set({ category_id: e.target.value })}
                    required
                  >
                    <option value="">Elegir…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {form.scope === 'product' && (
                <div className="fld">
                  <label htmlFor="pr-prod">Producto</label>
                  <select
                    id="pr-prod"
                    value={form.product_id}
                    onChange={(e) => set({ product_id: e.target.value })}
                    required
                  >
                    <option value="">Elegir…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <section className="adm-card">
            <h2 className="card-t">Condiciones</h2>
            <div className="fld-row">
              <div className="fld">
                <label htmlFor="pr-minq">Mínimo de unidades</label>
                <input
                  id="pr-minq"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={form.min_quantity}
                  onChange={(e) => set({ min_quantity: e.target.value })}
                />
                <span className="hint">
                  De los productos alcanzados. Por ejemplo, 3 para “llevando 3 o más”.
                </span>
              </div>
              <div className="fld">
                <label htmlFor="pr-mint">Compra mínima</label>
                <div className="in-pre">
                  <span>$</span>
                  <input
                    id="pr-mint"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={form.min_total}
                    onChange={(e) => set({ min_total: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <span className="hint">Del pedido completo. Vacío: sin mínimo.</span>
              </div>
            </div>
            <div className="fld-row">
              <div className="fld">
                <label htmlFor="pr-from">Desde</label>
                <input
                  id="pr-from"
                  type="date"
                  value={form.starts_at}
                  onChange={(e) => set({ starts_at: e.target.value })}
                />
              </div>
              <div className="fld">
                <label htmlFor="pr-to">Hasta</label>
                <input
                  id="pr-to"
                  type="date"
                  value={form.ends_at}
                  onChange={(e) => set({ ends_at: e.target.value })}
                />
                <span className="hint">Incluye ese día completo. Vacíos: sin fecha límite.</span>
              </div>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set({ active: e.target.checked })}
              />
              Activa
            </label>
          </section>

          <div className="pform-bar">
            {error && <div className="msg-err">{error}</div>}
            <div className="pform-actions">
              <button type="button" className="btn-sm gray" onClick={cancel} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className="btn-sm" disabled={busy}>
                {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear promoción'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="tbl-wrap">
        <table className="tbl tbl-promos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descuento</th>
              <th>Usos</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Todavía no hay promociones. Creá la primera con “Nueva promoción”.
                </td>
              </tr>
            )}
            {promos.map((p) => {
              const status = promoStatus(p, now);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.code && (
                      <>
                        {' '}
                        <span className="code-pill">{p.code}</span>
                      </>
                    )}
                    <small className="row-sub">{p.code ? 'Cupón' : 'Campaña'}</small>
                  </td>
                  <td>{promoSummary(p, { category: p.category_name, product: p.product_name })}</td>
                  <td>{p.code ? `${p.uses}${p.max_uses ? ` / ${p.max_uses}` : ''}` : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={STATUS_CLASS[status]}
                      onClick={() => toggle(p)}
                      disabled={busy}
                      title={p.active ? 'Tocá para pausarla' : 'Tocá para reactivarla'}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn-sm gray" onClick={() => startEdit(p)} disabled={busy}>
                        Editar
                      </button>
                      <button type="button" className="btn-sm danger" onClick={() => remove(p)} disabled={busy}>
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
