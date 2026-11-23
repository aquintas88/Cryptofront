import { describe, it, expect } from 'vitest';
import { rentabilidadAnualizada } from '../src/services/inversiones.service';

const DIA = 86_400_000;

describe('rentabilidad anualizada', () => {
  it('un año exacto con factor 1,10 da un 10 %', () => {
    const alta = new Date(Date.UTC(2025, 0, 1));
    const hoy = new Date(+alta + 365 * DIA);
    expect(rentabilidadAnualizada([{ factor: 1.1 }], alta, hoy)).toBeCloseTo(10, 1);
  });

  it('medio año con factor 1,05 se anualiza a algo más del 10 %', () => {
    const alta = new Date(Date.UTC(2025, 0, 1));
    const hoy = new Date(+alta + 182.5 * DIA);
    expect(rentabilidadAnualizada([{ factor: 1.05 }], alta, hoy)).toBeCloseTo(10.25, 1);
  });

  it('periodos de menos de 90 días no se anualizan', () => {
    const alta = new Date(Date.UTC(2026, 0, 1));
    const hoy = new Date(+alta + 30 * DIA);
    expect(rentabilidadAnualizada([{ factor: 1.02 }], alta, hoy)).toBeNull();
  });

  it('sin meses no hay cifra', () => {
    expect(rentabilidadAnualizada([], new Date(Date.UTC(2025, 0, 1)))).toBeNull();
  });
});
