import { waNumber } from '@/lib/catalog';
import { IconWhatsApp } from '@/components/icons';

// Botón para escribirle por WhatsApp a quien hizo el pedido (lista y detalle del
// panel). Los pedidos anteriores a que el teléfono fuera obligatorio no lo tienen:
// ahí el botón queda apagado, para que se vea que existe y por qué no anda.
export function OrderWhatsApp({
  id,
  name,
  phone,
  label = 'WhatsApp',
}: {
  id: number;
  name: string;
  phone: string;
  label?: string;
}) {
  if (!phone) {
    return (
      <span
        className="btn-sm off no-print"
        aria-disabled="true"
        title="Este pedido se hizo sin teléfono"
      >
        <IconWhatsApp /> {label}
      </span>
    );
  }

  const text = `Hola${name ? ` ${name}` : ''}, te escribimos por tu pedido #${id}.`;
  return (
    <a
      className="btn-sm no-print"
      target="_blank"
      rel="noopener"
      href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`}
      title={`Escribirle a ${name || 'quien hizo el pedido'} por WhatsApp`}
    >
      <IconWhatsApp /> {label}
    </a>
  );
}
