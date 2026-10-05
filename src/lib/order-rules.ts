// Reglas de los pedidos que no tocan la base: se pueden probar solas, y los
// textos también los usa el navegador (el botón de confirmar del panel).

// Un renglón del pedido cuyo producto controla stock, con lo que hay ahora
export interface StockLine {
  itemId: number;
  productId: number;
  name: string;
  quantity: number;
  stock: number;
}

// Producto del que no hay unidades suficientes para un pedido
export interface ShortItem {
  name: string;
  wanted: number;
  available: number;
}

export interface StockPlan {
  // Unidades que descuenta cada renglón (las que se devuelven si el pedido vuelve a pendiente)
  takes: { itemId: number; take: number }[];
  // Stock con el que queda cada producto
  stock: { productId: number; stock: number }[];
  // Productos de los que no alcanza
  short: ShortItem[];
}

// Qué se descuenta al confirmar un pedido. De cada producto sale lo pedido o, si
// no alcanza, lo que haya: el stock nunca queda en negativo.
export function planStock(lines: StockLine[]): StockPlan {
  const left = new Map<number, number>();
  const takes: StockPlan['takes'] = [];
  const short: ShortItem[] = [];
  for (const l of lines) {
    const have = left.get(l.productId) ?? Math.max(0, l.stock);
    const take = Math.min(have, l.quantity);
    left.set(l.productId, have - take);
    takes.push({ itemId: l.itemId, take });
    if (take < l.quantity) short.push({ name: l.name, wanted: l.quantity, available: have });
  }
  return {
    takes,
    stock: [...left].map(([productId, stock]) => ({ productId, stock })),
    short,
  };
}

// "quedan 3", "queda 1", "no queda ninguna"
export function unitsLeft(n: number): string {
  if (n <= 0) return 'no queda ninguna';
  return n === 1 ? 'queda 1' : `quedan ${n}`;
}

// La pregunta del panel cuando se quiere confirmar un pedido y el stock no alcanza
export function shortStockQuestion(orderId: number, short: ShortItem[]): string {
  const lines = short.map((s) => `• ${s.name}: pide ${s.wanted}, ${unitsLeft(s.available)}`);
  const which = short.length === 1 ? 'ese producto' : 'esos productos';
  return (
    `No alcanza el stock para el pedido #${orderId}:\n\n${lines.join('\n')}\n\n` +
    `¿Confirmarlo igual? El stock de ${which} queda en 0.`
  );
}

// Cuánto hace que espera un pedido pendiente; null si es de hoy
export function waitingLabel(days: number): string | null {
  if (days < 1) return null;
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

// Recordatorio del panel: pedidos que siguen pendientes después de un día.
// stale = cuántos son; oldestDays = días que espera el más viejo. null = nada que recordar.
export function pendingReminder(
  stale: number,
  oldestDays: number
): { title: string; advice: string } | null {
  if (stale < 1) return null;
  if (stale === 1)
    return {
      title: `Hay 1 pedido pendiente desde ${waitingLabel(Math.max(1, oldestDays))}.`,
      advice:
        'Si ya se cobró, marcalo como Confirmado: así se descuenta del stock. Si no se concretó, eliminalo.',
    };
  const oldest = oldestDays >= 2 ? ` (el más viejo, desde ${waitingLabel(oldestDays)})` : '';
  return {
    title: `Hay ${stale} pedidos pendientes desde hace más de un día${oldest}.`,
    advice:
      'Los que ya se cobraron, marcalos como Confirmado: así se descuentan del stock. Los que no se concretaron, eliminalos.',
  };
}
