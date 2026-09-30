'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Settings } from '@/lib/data';

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Settings) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setOk('');
    setError('');
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOk('Ajustes guardados');
      router.refresh();
    } else {
      setError('No se pudieron guardar los ajustes');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 620 }}>
      {ok && <div className="msg-ok">{ok}</div>}
      {error && <div className="msg-err">{error}</div>}

      <div className="fld">
        <label htmlFor="shop_name">Nombre del negocio</label>
        <input id="shop_name" value={form.shop_name} onChange={set('shop_name')} required />
      </div>

      <div className="fld">
        <label htmlFor="whatsapp_phone">WhatsApp (con código de país, solo números)</label>
        <input
          id="whatsapp_phone"
          value={form.whatsapp_phone}
          onChange={set('whatsapp_phone')}
          placeholder="5491122334455"
          pattern="[0-9]{8,15}"
          required
        />
        <span className="hint">
          Ejemplo Argentina: 549 + código de área + número, sin espacios ni guiones.
        </span>
      </div>

      <div className="fld">
        <label htmlFor="tagline">Título del catálogo</label>
        <input
          id="tagline"
          value={form.tagline}
          onChange={set('tagline')}
          placeholder="Todo para la cocina y la mesa"
        />
      </div>

      <div className="fld">
        <label htmlFor="footer_note">Texto de entrega / aclaraciones</label>
        <textarea
          id="footer_note"
          value={form.footer_note}
          onChange={set('footer_note')}
          placeholder="Retiro en el local o envío en el día. Los precios se confirman al cotizar."
        />
      </div>

      <button className="btn-sm" type="submit" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar ajustes'}
      </button>
    </form>
  );
}
