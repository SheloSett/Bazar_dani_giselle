import Link from 'next/link';

export default function OrderNotFound() {
  return (
    <main className="ord">
      <h1>No encontramos este pedido</h1>
      <p className="ord-meta">
        El link puede estar incompleto o el pedido no llegó a guardarse. El detalle
        igual está escrito en el mensaje de WhatsApp.
      </p>
      <Link className="ord-back" href="/">
        Ver el catálogo
      </Link>
    </main>
  );
}
