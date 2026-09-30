// Íconos SVG propios (sin librerías ni emojis)

export function IconBasket() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 9h15l-1.4 10.5h-12L4.5 9z" />
      <path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function IconMinus() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconWhatsApp() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3z" />
      <path d="M9.2 8.6c.4 2.6 3.6 5.8 6.2 6.2l.9-1.7-2-1-.9.8c-.9-.4-1.9-1.4-2.3-2.3l.8-.9-1-2z" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

export function IconTruck() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 6h11v10h-11z" />
      <path d="M13.5 9.5h4.2l2.8 3.3V16h-7" />
      <circle cx="7" cy="17.6" r="1.9" />
      <circle cx="17" cy="17.6" r="1.9" />
    </svg>
  );
}

export function IconStore() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5 5.6 4.5h12.8L20 9.5" />
      <path d="M4 9.5a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0 2.67 2.67 0 0 0 5.33 0" />
      <path d="M5.5 12.2v7.3h13v-7.3" />
      <path d="M10 19.5v-4.3h4v4.3" />
    </svg>
  );
}

export function IconUpload() {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" />
      <path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </svg>
  );
}

export function IconPhoto({ className = 'placeholder' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ stroke: 'currentColor', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M5 17l4.5-4.5 3 3L16 12l4 4" />
    </svg>
  );
}
