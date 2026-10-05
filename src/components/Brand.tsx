import { thumbUrl } from '@/lib/catalog';

// Marca del negocio en los encabezados: el logo si hay uno cargado; si no, el nombre.
// withName: el logo es cuadrado o redondo, y va con el nombre al lado.
export function Brand({
  name,
  logo,
  withName = false,
}: {
  name: string;
  logo: string | null;
  withName?: boolean;
}) {
  if (!logo) return <span className="brand">{name}</span>;
  if (!withName) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="brand-logo" src={thumbUrl(logo)} alt={name} />;
  }
  return (
    <span className="brand brand-mark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-logo" src={thumbUrl(logo)} alt="" />
      {name}
    </span>
  );
}
