import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, X, Star } from './iconos';
import { cn, sinTildes } from '../../lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  // #166/#168: nivel de anidamiento (0 = raíz) para listas jerárquicas (p.ej. zonas con
  // subzonas) — sangría real vía CSS, no espacios metidos a mano en el label (el HTML no
  // garantiza que se vean distintos 2 niveles de indentado solo con más espacios).
  depth?: number;
  // #170 (13/10): opción entre las más usadas por este usuario (ver useRecientes) — se
  // antepone en la lista y se marca con un icono, solo mientras no se esté filtrando por
  // texto (al buscar, el orden por relevancia del filtro manda).
  reciente?: boolean;
}

interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  clearable?: boolean;
  // Mensaje cuando la lista de opciones está vacía DE ORIGEN (no por el texto buscado) —
  // p.ej. "no hay zonas dadas de alta todavía" en vez del genérico "Sin resultados" (#64).
  noOptionsMessage?: string;
  // Solo marca visualmente el campo como obligatorio (asterisco) (#144).
  required?: boolean;
  // Búsqueda en el servidor para listas demasiado grandes para cargarlas enteras: si se indica, el texto escrito se
  // notifica (con retardo) y las opciones recibidas ya vienen filtradas, así que no se vuelve a filtrar en el cliente.
  onSearch?: (texto: string) => void;
  buscando?: boolean;
}

export function Combobox({
  label, value, onChange, options, placeholder = 'Buscar…',
  emptyLabel, disabled, error, className, clearable = false, noOptionsMessage, required, onSearch, buscando,
}: ComboboxProps) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlighted, setHighlighted] = useState(0);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  // Insensible a tildes (#69) — "hernan" debe encontrar "Hernán". El filtrado es en cliente
  // (sobre las opciones ya cargadas), por eso se normaliza aquí en vez de en el backend.
  const filtered = onSearch ? options : query
    ? options.filter(o => sinTildes(o.label.toLowerCase()).includes(sinTildes(query.toLowerCase())))
    : options;

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (!onSearch) return;
    const t = window.setTimeout(() => onSearch(query.trim()), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const select = (opt: ComboboxOption) => {
    onChange(opt.value);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && filtered[highlighted]) { e.preventDefault(); select(filtered[highlighted]); }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  return (
    <div className={cn('flex flex-col gap-1', className)} ref={containerRef}>
      {label && (
        <label htmlFor={uid} className="text-xs font-medium text-text-secondary font-dm uppercase tracking-wide">
          {label}{required && <span className="text-gold ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={uid}
          type="text"
          disabled={disabled}
          value={open ? query : selectedLabel}
          placeholder={open ? placeholder : (emptyLabel ?? placeholder)}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { if (!disabled) setOpen(true); }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          className={cn(
            'w-full bg-surface2 border border-border rounded-lg px-3 py-2 pr-8 text-text-primary text-sm font-dm',
            'placeholder:text-text-secondary/50 outline-none',
            'focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            open && !selectedLabel && 'text-text-secondary',
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {clearable && value && !disabled && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(''); setQuery(''); }}
              className="text-text-secondary/50 hover:text-text-primary"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {/* #169: antes era un icono decorativo sin gestor de clic — como está encima del
              input (mismo bloque absolute), tapaba el clic y el desplegable no se abría
              pulsando justo ahí, solo escribiendo o enfocando por otro lado. */}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={e => { e.preventDefault(); if (!disabled) { setOpen(o => !o); inputRef.current?.focus(); } }}
            className="disabled:cursor-not-allowed"
          >
            <ChevronDown className={cn('w-4 h-4 text-text-secondary/50 transition-transform', open && 'rotate-180')} />
          </button>
        </div>

        {open && (
          <ul
            ref={listRef}
            className="absolute z-50 mt-1 w-full bg-surface2 border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto"
          >
            {emptyLabel && (
              <li
                onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false); }}
                className={cn(
                  'px-3 py-2 text-sm font-dm cursor-pointer text-text-secondary/70 italic',
                  !value && 'bg-gold/10',
                  'hover:bg-surface',
                )}
              >
                {emptyLabel}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm font-dm text-text-secondary/50 italic">
                {buscando ? 'Buscando…' : options.length === 0 && noOptionsMessage && !query ? noOptionsMessage : 'Sin resultados'}
              </li>
            ) : filtered.map((opt, i) => (
              <li key={opt.value}>
                <div
                  onMouseDown={e => { e.preventDefault(); select(opt); }}
                  style={opt.depth ? { paddingLeft: `${12 + opt.depth * 16}px` } : undefined}
                  className={cn(
                    'px-3 py-2 text-sm font-dm cursor-pointer transition-colors flex items-center gap-1.5',
                    i === highlighted ? 'bg-gold/15 text-text-primary' : 'hover:bg-surface text-text-primary',
                    opt.value === value && 'font-semibold text-gold',
                  )}
                >
                  {!!opt.depth && <span className="text-text-secondary/50 mr-1">↳</span>}
                  {/* #170 (13/10): entre las más usadas por este usuario — ver useRecientes. */}
                  {!query && opt.reciente && <Star className="w-3 h-3 text-gold shrink-0" />}
                  {opt.label}
                </div>
                {/* Separador tras el último "más usado", antes del resto de la lista. */}
                {!query && opt.reciente && !filtered[i + 1]?.reciente && filtered[i + 1] && (
                  <div className="border-b border-border mx-2" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-danger font-dm">{error}</p>}
    </div>
  );
}
