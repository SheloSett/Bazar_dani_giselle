'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { thumbUrl } from '@/lib/catalog';
import { IconUpload } from '@/components/icons';

const MAX_BYTES = 8 * 1024 * 1024;

export function LogoForm({ initial, shopName }: { initial: string | null; shopName: string }) {
  const router = useRouter();
  const [logo, setLogo] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setError('');
    setOk('');
    if (file.size > MAX_BYTES) {
      setError('La imagen supera los 8 MB');
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append('logo', file);
    const res = await fetch('/api/admin/settings/logo', { method: 'POST', body: form });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.logo) {
      setLogo(data.logo);
      setOk('Logo guardado');
      router.refresh();
    } else {
      setError(data?.error || 'No se pudo guardar el logo');
    }
    if (fileRef.current) fileRef.current.value = '';
    setBusy(false);
  };

  const remove = async () => {
    if (busy || !confirm('¿Quitar el logo? El catálogo vuelve a mostrar el nombre.')) return;
    setError('');
    setOk('');
    setBusy(true);
    const res = await fetch('/api/admin/settings/logo', { method: 'DELETE' });
    if (res.ok) {
      setLogo(null);
      setOk('Logo quitado');
      router.refresh();
    } else {
      setError('No se pudo quitar el logo');
    }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 620 }}>
      {ok && <div className="msg-ok">{ok}</div>}
      {error && <div className="msg-err">{error}</div>}

      <div className="logo-row">
        <div className="logo-box">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl(logo)} alt={`Logo de ${shopName}`} />
          ) : (
            <span>Sin logo: se muestra “{shopName}”</span>
          )}
        </div>
        <div className="logo-actions">
          <label className={busy ? 'btn-sm off' : 'btn-sm'} htmlFor="logo-file">
            <IconUpload /> {busy ? 'Guardando…' : logo ? 'Cambiar logo' : 'Subir logo'}
          </label>
          <input
            ref={fileRef}
            id="logo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
          {logo && (
            <button type="button" className="btn-sm danger" onClick={remove} disabled={busy}>
              Quitar
            </button>
          )}
        </div>
      </div>
      <p className="section-note" style={{ marginTop: 12 }}>
        JPG, PNG, WebP o AVIF, hasta 8 MB. Lo ideal es un PNG con fondo transparente. Si es
        más ancho que alto, reemplaza al nombre en el encabezado; si es cuadrado o redondo,
        va con el nombre al lado. También se usa en los pedidos, en el catálogo para imprimir
        y como ícono de la pestaña del navegador.
      </p>
    </div>
  );
}
