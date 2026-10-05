import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: false },
};

// Cualquier dirección que no existe (antes salía la página genérica en inglés)
export default function NotFound() {
  return (
    <main className="ord oops">
      <h1>No encontramos esa página</h1>
      <p className="ord-meta">
        Puede que la dirección esté mal escrita o que la página ya no exista.
      </p>
      <Link className="btn btn-primary" href="/">
        Ver el catálogo
      </Link>
    </main>
  );
}
