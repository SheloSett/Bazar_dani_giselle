'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

// Cuánto de la foto se puede perder al recortarla para llenar el recuadro. Más que
// eso (ej: una foto vertical en un recuadro apaisado pierde ~50 %) y se muestra entera.
const MAX_CROP = 0.35;

// Foto que llena su recuadro. Si para llenarlo habría que recortar demasiado, se ve
// entera sobre la misma foto desenfocada en vez de cortada.
// fit: 'auto' decide según la forma; 'whole' siempre entera (ficha); 'cover' siempre
// llena el recuadro (collage decorativo de la portada).
export function FitPhoto({
  src,
  alt,
  fit = 'auto',
  loading,
}: {
  src: string;
  alt: string;
  fit?: 'auto' | 'whole' | 'cover';
  loading?: 'lazy' | 'eager';
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [fitWhole, setFitWhole] = useState(fit === 'whole');

  useEffect(() => {
    if (fit !== 'auto') return;
    const img = ref.current;
    const box = img?.parentElement;
    if (!img || !box) return;
    const check = () => {
      if (!img.naturalWidth || !box.clientWidth || !box.clientHeight) return;
      const rImg = img.naturalWidth / img.naturalHeight;
      const rBox = box.clientWidth / box.clientHeight;
      setFitWhole(1 - Math.min(rImg / rBox, rBox / rImg) > MAX_CROP);
    };
    check(); // por si ya estaba cargada (caché)
    img.addEventListener('load', check);
    // el recuadro cambia de forma según el ancho (ej: la portada en el celular)
    const ro = new ResizeObserver(check);
    ro.observe(box);
    return () => {
      img.removeEventListener('load', check);
      ro.disconnect();
    };
  }, [src, fit]);

  return (
    <span
      className={fitWhole ? 'fit whole' : 'fit'}
      style={{ '--src': `url("${src}")` } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt={alt} loading={loading} draggable={false} />
    </span>
  );
}
