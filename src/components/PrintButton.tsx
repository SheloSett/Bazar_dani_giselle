'use client';

// Abre el diálogo de impresión del navegador, que también permite "Guardar como PDF"
export function PrintButton() {
  return (
    <button type="button" className="btn-sm no-print" onClick={() => window.print()}>
      Imprimir o guardar PDF
    </button>
  );
}
