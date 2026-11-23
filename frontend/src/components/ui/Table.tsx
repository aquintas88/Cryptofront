// Tabla estándar de la plataforma (portada del componente de InmoKira): cabecera ordenable,
// vista de tarjetas en móvil, mensaje de vacío y paginación.
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
}

const Flecha = ({ dir }: { dir: 'asc' | 'desc' }) => (
  <span aria-hidden="true" className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>
);

export function Table<T>({ columns, data, keyExtractor, onRowClick, sortKey, sortDir, onSort, emptyMessage = 'Sin resultados' }: TableProps<T>) {
  const valor = (col: Column<T>, row: T) =>
    col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—');
  const vacio = data.length === 0;
  const [primera, ...resto] = columns;

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-border bg-surface2">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary',
                    col.className,
                  )}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && sortDir && <Flecha dir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vacio ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">{emptyMessage}</td>
              </tr>
            ) : data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn('border-b border-border/50 transition-colors duration-100', onRowClick && 'cursor-pointer hover:bg-surface2')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 align-top text-text-primary', col.className)}>{valor(col, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {vacio ? (
          <div className="rounded-lg border border-border px-4 py-12 text-center text-sm text-text-secondary font-dm">{emptyMessage}</div>
        ) : data.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={cn('rounded-lg border border-border bg-surface2/50 px-4 py-3', onRowClick && 'cursor-pointer')}
          >
            <div className="mb-1.5 font-dm font-semibold text-text-primary">{valor(primera, row)}</div>
            <div className="space-y-1">
              {resto.map((col) => (
                <div key={col.key} className="flex items-baseline justify-between gap-3 font-dm text-sm">
                  <span className="flex-shrink-0 text-xs uppercase tracking-wide text-text-secondary">{col.header}</span>
                  <span className="truncate text-right text-text-primary">{valor(col, row)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  total: number;
}

export function Pagination({ page, totalPages, onPage, total }: PaginationProps) {
  const boton = 'rounded border border-border px-3 py-1 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex items-center justify-between py-3 font-dm text-sm text-text-secondary">
      <span>{total} resultado{total !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(1)} disabled={page <= 1} title="Primera página" className={boton}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className={boton}>Anterior</button>
        <span className="px-2">{page} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={boton}>Siguiente</button>
        <button onClick={() => onPage(totalPages)} disabled={page >= totalPages} title="Última página" className={boton}>»</button>
      </div>
    </div>
  );
}
