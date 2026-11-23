// Ordenación de tablas. Mismo comportamiento que el componente de InmoKira.
import { useState } from 'react';

export interface SortState<T extends string> {
  field: T;
  dir: 'asc' | 'desc';
}

export function useSortable<T extends string>(defaultField: T, defaultDir: 'asc' | 'desc' = 'asc') {
  const [sort, setSort] = useState<SortState<T>>({ field: defaultField, dir: defaultDir });
  const toggle = (field: T) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    );
  };
  return { sort, toggle };
}

export function sortBy<T>(items: T[], field: keyof T, dir: 'asc' | 'desc'): T[] {
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return dir === 'asc' ? 1 : -1;
    if (bv == null) return dir === 'asc' ? -1 : 1;
    const cmp = String(av).localeCompare(String(bv), 'es', { numeric: true });
    return dir === 'asc' ? cmp : -cmp;
  });
}
