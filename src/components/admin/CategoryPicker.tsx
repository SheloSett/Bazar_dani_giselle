'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { Category } from '@/lib/data';
import { normalizeText } from '@/lib/catalog';
import { IconPlus } from '@/components/icons';

type Option =
  | { kind: 'none' }
  | { kind: 'pick'; category: Category }
  | { kind: 'create'; name: string };

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

// Un solo campo para elegir la categoría o crear una nueva: al escribir filtra la
// lista (sin importar tildes ni mayúsculas) y, si no existe, ofrece "Crear «…»"
export function CategoryPicker({
  id,
  categories,
  value,
  onChange,
  onCreate,
}: {
  id: string;
  categories: Category[];
  value: number | null;
  onChange: (id: number | null) => void;
  onCreate: (name: string) => Promise<Category | null>;
}) {
  const listId = useId();
  const selected = categories.find((c) => c.id === value) ?? null;
  const [text, setText] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false); // escribió desde que abrió la lista
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);

  const exactMatch = (s: string) =>
    categories.find((c) => normalizeText(c.name) === normalizeText(clean(s))) ?? null;

  const options = useMemo<Option[]>(() => {
    const q = normalizeText(clean(text));
    // Recién abierta, sin escribir, se ve la lista entera
    if (!filtering || !q) {
      return [{ kind: 'none' }, ...categories.map((category) => ({ kind: 'pick' as const, category }))];
    }
    const list: Option[] = categories
      .filter((c) => normalizeText(c.name).includes(q))
      .map((category) => ({ kind: 'pick' as const, category }));
    if (!categories.some((c) => normalizeText(c.name) === q))
      list.push({ kind: 'create', name: clean(text) });
    return list;
  }, [text, filtering, categories]);

  const close = (restoreTo: Category | null = selected) => {
    setOpen(false);
    setFiltering(false);
    setText(restoreTo?.name ?? '');
  };

  const choose = async (o: Option) => {
    if (o.kind === 'none') {
      onChange(null);
      close(null);
    } else if (o.kind === 'pick') {
      onChange(o.category.id);
      close(o.category);
    } else {
      setCreating(true);
      const cat = await onCreate(o.name);
      setCreating(false);
      if (cat) onChange(cat.id);
      close(cat ?? selected);
    }
  };

  const openList = () => {
    setOpen(true);
    setFiltering(false);
    // arranca marcada la categoría actual (la posición 0 es "Sin categoría")
    setActive(selected ? categories.findIndex((c) => c.id === selected.id) + 1 : 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openList();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === 'Enter' && open) {
      // Enter elige la opción marcada (y no manda el formulario)
      e.preventDefault();
      if (options[active]) void choose(options[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  };

  const onBlur = () => {
    if (!open) return;
    // Si escribió el nombre exacto de una existente, queda elegida; vacío = sin categoría
    if (!clean(text)) {
      onChange(null);
      close(null);
      return;
    }
    const match = exactMatch(text);
    if (match) onChange(match.id);
    close(match ?? selected);
  };

  return (
    <div className="cpick">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Sin categoría"
        value={creating ? 'Creando…' : text}
        readOnly={creating}
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(e) => {
          setText(e.target.value);
          setFiltering(true);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      {open && options.length > 0 && (
        // mousedown sin perder el foco del campo: si no, el blur cierra la lista antes del clic
        <ul id={listId} role="listbox" className="cpick-list" onMouseDown={(e) => e.preventDefault()}>
          {options.map((o, i) => {
            const isCurrent =
              (o.kind === 'none' && !selected) || (o.kind === 'pick' && o.category.id === value);
            return (
              <li
                key={o.kind === 'pick' ? o.category.id : o.kind}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={[
                  i === active ? 'on' : '',
                  isCurrent ? 'cur' : '',
                  o.kind !== 'pick' ? o.kind : '',
                ].join(' ').trim() || undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => void choose(o)}
              >
                {o.kind === 'none' && 'Sin categoría'}
                {o.kind === 'pick' && o.category.name}
                {o.kind === 'create' && (
                  <>
                    <IconPlus /> Crear «{o.name}»
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
