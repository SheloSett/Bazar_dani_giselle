'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Settings, TextSettings } from '@/lib/data';

type PerkKey = 'perk1' | 'perk2' | 'perk3';

// A qué se parece cada lugar de la franja: el ícono es fijo, el texto no
const PERKS: { key: PerkKey; icon: string }[] = [
  { key: 'perk1', icon: 'camión' },
  { key: 'perk2', icon: 'local' },
  { key: 'perk3', icon: 'WhatsApp' },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof TextSettings) => (
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
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      // Vuelve como quedó guardado (el WhatsApp, por ejemplo, solo con dígitos)
      setForm(data);
      setOk('Ajustes guardados');
      router.refresh();
    } else {
      setError(data?.error || 'No se pudieron guardar los ajustes');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="settings-form">
      <section className="adm-card">
        <h2 className="card-t">Datos del negocio</h2>

        <div className="fld-row">
          <div className="fld">
            <label htmlFor="shop_name">Nombre del negocio</label>
            <input
              id="shop_name"
              value={form.shop_name}
              onChange={set('shop_name')}
              maxLength={80}
              required
            />
          </div>
          <div className="fld">
            <label htmlFor="whatsapp_phone">WhatsApp donde llegan los pedidos</label>
            <input
              id="whatsapp_phone"
              type="tel"
              inputMode="tel"
              value={form.whatsapp_phone}
              onChange={set('whatsapp_phone')}
              placeholder="5491122334455"
              maxLength={40}
              required
            />
            <span className="hint">
              Con código de país. Argentina: 549 + código de área + número.
            </span>
          </div>
        </div>

        <div className="fld">
          <label htmlFor="tagline">Título de la portada</label>
          <input
            id="tagline"
            value={form.tagline}
            onChange={set('tagline')}
            maxLength={120}
            placeholder="Todo para la cocina y la mesa"
          />
        </div>

        <div className="fld">
          <label htmlFor="footer_note">Texto de entrega y aclaraciones</label>
          <textarea
            id="footer_note"
            value={form.footer_note}
            onChange={set('footer_note')}
            maxLength={300}
            placeholder="Retiro en el local o envío en el día. Los precios se confirman al cotizar."
          />
          <span className="hint">Aparece debajo del título, en la portada.</span>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="card-t">Beneficios de la portada</h2>
        <p className="card-note" style={{ marginBottom: 14 }}>
          La franja con tres íconos que está debajo de la portada. Para sacar uno, dejá su
          título vacío.
        </p>
        {PERKS.map(({ key, icon }, i) => (
          <div className="fld-row" key={key}>
            <div className="fld">
              <label htmlFor={`${key}_title`}>{`Título ${i + 1} (ícono de ${icon})`}</label>
              <input
                id={`${key}_title`}
                value={form[`${key}_title`]}
                onChange={set(`${key}_title`)}
                maxLength={40}
              />
            </div>
            <div className="fld">
              <label htmlFor={`${key}_text`}>Aclaración</label>
              <input
                id={`${key}_text`}
                value={form[`${key}_text`]}
                onChange={set(`${key}_text`)}
                maxLength={90}
              />
            </div>
          </div>
        ))}
      </section>

      <div className="settings-save">
        {ok && <div className="msg-ok">{ok}</div>}
        {error && <div className="msg-err">{error}</div>}
        <button className="btn-sm" type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar ajustes'}
        </button>
      </div>
    </form>
  );
}
