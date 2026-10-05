import { thumbUrl } from '@/lib/catalog';

// Marca del negocio en los encabezados: el logo si hay uno cargado; si no, el nombre
export function Brand({ name, logo }: { name: string; logo: string | null }) {
  if (!logo) return <span className="brand">{name}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="brand-logo" src={thumbUrl(logo)} alt={name} />;
}
