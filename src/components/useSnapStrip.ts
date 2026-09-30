import { useCallback, useRef, useState } from 'react';

// Tira de fotos con scroll-snap horizontal: se desliza con el dedo en el
// celular y con flechas en escritorio. Lleva el índice de la foto visible.
export function useSnapStrip(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(Math.min(count - 1, Math.max(0, i)));
  }, [count]);

  const go = useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el) return;
      const n = Math.min(count - 1, Math.max(0, i));
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({ left: n * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
      setIdx(n);
    },
    [count]
  );

  return { ref, idx, go, onScroll };
}
