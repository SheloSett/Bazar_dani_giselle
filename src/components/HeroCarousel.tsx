'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { IconChevronLeft, IconChevronRight } from '@/components/icons';

// Cada cuánto pasa sola a la siguiente
const AUTO_MS = 6000;

// Lo que la frena: el mouse encima, el foco del teclado adentro o el dedo apoyado
type Hold = 'hover' | 'focus' | 'touch';

// Portada con banners: las imágenes se deslizan (con el dedo, las flechas o los
// puntos) y pasan solas. Se frena mientras se está mirando o usando (ver Hold),
// mientras la pestaña no se ve y siempre si la persona pidió menos movimiento.
export function HeroCarousel({ slides }: { slides: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [holds, setHolds] = useState<Record<Hold, boolean>>({
    hover: false,
    focus: false,
    touch: false,
  });
  const paused = holds.hover || holds.focus || holds.touch;
  const hold = (key: Hold, on: boolean) =>
    setHolds((h) => (h[key] === on ? h : { ...h, [key]: on }));
  const n = slides.length;

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const target = el.children[i] as HTMLElement | undefined;
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: target.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  // La imagen que se ve es la más cerca del borde izquierdo de la tira
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    let best = 0;
    for (let i = 1; i < el.children.length; i++) {
      const left = (el.children[i] as HTMLElement).offsetLeft;
      const bestLeft = (el.children[best] as HTMLElement).offsetLeft;
      if (Math.abs(left - el.scrollLeft) < Math.abs(bestLeft - el.scrollLeft)) best = i;
    }
    setIndex((cur) => (cur === best ? cur : best));
  };

  // Pasa sola. El temporizador vuelve a empezar cada vez que cambia la imagen, así
  // después de deslizar a mano hay tiempo de verla.
  useEffect(() => {
    if (paused || n < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === 'visible') go((index + 1) % n);
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, n, go]);

  return (
    <section
      className="hero hero-carousel"
      aria-roledescription="carrusel"
      aria-label="Portada"
      // Solo el mouse de verdad: en el celular, tocar también "entra" y nunca "sale"
      onPointerEnter={(e: PointerEvent) => e.pointerType === 'mouse' && hold('hover', true)}
      onPointerLeave={(e: PointerEvent) => e.pointerType === 'mouse' && hold('hover', false)}
      // Solo el foco del teclado: tocar un punto en Android también deja el foco ahí
      onFocus={(e: FocusEvent) => hold('focus', (e.target as HTMLElement).matches(':focus-visible'))}
      onBlur={() => hold('focus', false)}
      onTouchStart={() => hold('touch', true)}
      onTouchEnd={() => hold('touch', false)}
      onTouchCancel={() => hold('touch', false)}
    >
      <div className="hero-wrap">
        <div className="hero-track" ref={track} onScroll={onScroll}>
          {slides.map((slide, i) => (
            <div
              key={i}
              className="hero-slide"
              role="group"
              aria-roledescription="imagen"
              aria-label={`${i + 1} de ${n}`}
            >
              {slide}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="hero-nav prev"
          onClick={() => go((index - 1 + n) % n)}
          aria-label="Imagen anterior"
        >
          <IconChevronLeft />
        </button>
        <button
          type="button"
          className="hero-nav next"
          onClick={() => go((index + 1) % n)}
          aria-label="Imagen siguiente"
        >
          <IconChevronRight />
        </button>
      </div>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ver imagen ${i + 1} de ${n}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}
