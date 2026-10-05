'use client';

// Si una página falla al armarse (por ejemplo, la base no responde): un aviso
// claro y la opción de reintentar, en lugar de la pantalla de error genérica
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="ord oops">
      <h1>Algo no salió bien</h1>
      <p className="ord-meta">
        No pudimos cargar la página. Probá de nuevo en un momento.
      </p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Reintentar
      </button>
    </main>
  );
}
