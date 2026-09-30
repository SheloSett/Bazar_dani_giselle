'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MIN_LENGTH = 8;

export function PasswordForm({ usingInitial }: { usingInitial: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk('');
    setError('');
    if (next !== confirm) {
      setError('Las claves nuevas no coinciden');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setOk('Clave cambiada. Si el panel estaba abierto en otro dispositivo, ahí se cerró la sesión.');
      setCurrent('');
      setNext('');
      setConfirm('');
      router.refresh();
    } else {
      setError(data?.error || 'No se pudo cambiar la clave');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 620 }}>
      {usingInitial && (
        <p className="section-note">
          Estás entrando con la clave inicial (la del archivo <code>.env</code> del
          servidor). Desde acá podés cambiarla sin tocar nada en el servidor.
        </p>
      )}
      {ok && <div className="msg-ok">{ok}</div>}
      {error && <div className="msg-err">{error}</div>}

      <div className="fld">
        <label htmlFor="current">Clave actual</label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>

      <div className="fld-row">
        <div className="fld">
          <label htmlFor="next">Clave nueva</label>
          <input
            id="next"
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <span className="hint">Mínimo {MIN_LENGTH} caracteres.</span>
        </div>
        <div className="fld">
          <label htmlFor="confirm">Repetir clave nueva</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      <button className="btn-sm" type="submit" disabled={busy}>
        {busy ? 'Cambiando…' : 'Cambiar clave'}
      </button>
    </form>
  );
}
