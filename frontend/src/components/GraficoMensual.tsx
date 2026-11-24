import { useMemo } from 'react';
import type { RentabilidadMes } from '../lib/api';
import { eur, pct } from './formato';
import type { Idioma } from '../web/textos';

// Gráfica anual: barras con la rentabilidad mensual (%) y línea con la ganancia acumulada (€) del periodo.
const W = 900, H = 340, ML = 70, MR = 70, MT = 28, MB = 46;

export function GraficoMensual({ meses, idioma }: { meses: RentabilidadMes[]; idioma: Idioma }) {
  const { barras, linea, maxPct, minPct, maxEur, minEur } = useMemo(() => {
    let acumEur = 0;
    const filas = meses.map((m) => {
      acumEur += m.gananciaEur;
      return { mes: m.mes, pct: m.rentabilidadPct, eur: acumEur, parcial: m.parcial };
    });
    const pcts = filas.map((f) => f.pct).concat(0);
    const eurs = filas.map((f) => f.eur).concat(0);
    return {
      barras: filas,
      linea: filas,
      maxPct: Math.max(...pcts), minPct: Math.min(...pcts),
      maxEur: Math.max(...eurs), minEur: Math.min(...eurs),
    };
  }, [meses]);

  if (barras.length === 0) return <p className="py-16 text-center text-sm text-slate-500">{idioma === 'en' ? 'No data for this period.' : 'Sin datos en este periodo.'}</p>;

  const n = barras.length;
  const ancho = (W - ML - MR) / n;
  const yPct = (v: number) => {
    const rango = (maxPct - minPct) || 1;
    return MT + (maxPct - v) / rango * (H - MT - MB);
  };
  const yEur = (v: number) => {
    const rango = (maxEur - minEur) || 1;
    return MT + (maxEur - v) / rango * (H - MT - MB);
  };
  const cero = yPct(0);
  const xCentro = (i: number) => ML + ancho * i + ancho / 2;
  const puntos = linea.map((f, i) => `${i === 0 ? 'M' : 'L'}${xCentro(i).toFixed(1)},${yEur(f.eur).toFixed(1)}`).join(' ');
  const etiquetaMes = (mes: string) => new Date(mes + '-01T00:00:00Z').toLocaleDateString(idioma === 'en' ? 'en-GB' : 'es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={idioma === 'en' ? 'Monthly return bars and cumulative gain line' : 'Barras de rentabilidad mensual y línea de ganancia acumulada'}>
        <line x1={ML} x2={W - MR} y1={cero} y2={cero} stroke="#0d2240" strokeOpacity=".25" />
        {barras.map((f, i) => {
          const y = Math.min(yPct(f.pct), cero);
          const h = Math.max(Math.abs(yPct(f.pct) - cero), 1);
          const ancho2 = ancho * 0.6;
          return (
            <g key={f.mes}>
              <rect x={xCentro(i) - ancho2 / 2} y={y} width={ancho2} height={h} rx={3}
                fill={f.pct >= 0 ? '#10b981' : '#ef4444'} fillOpacity={f.parcial ? 0.45 : 0.85} />
              <text x={xCentro(i)} y={f.pct >= 0 ? y - 6 : y + h + 14} textAnchor="middle" fontSize="11" fill="#334155">
                {pct(f.pct, idioma)}
              </text>
              <text x={xCentro(i)} y={H - 16} textAnchor="middle" fontSize="11" fill="#64748b">{etiquetaMes(f.mes)}</text>
            </g>
          );
        })}
        <path d={puntos} fill="none" stroke="#c9a24a" strokeWidth="2.5" />
        {linea.map((f, i) => (
          <g key={`p${f.mes}`}>
            <circle cx={xCentro(i)} cy={yEur(f.eur)} r={3.5} fill="#c9a24a" />
            <text x={xCentro(i)} y={yEur(f.eur) - 9} textAnchor="middle" fontSize="10" fill="#8a6a22">{eur(f.eur, idioma)}</text>
          </g>
        ))}
        <text x={ML - 8} y={MT - 10} textAnchor="end" fontSize="11" fill="#64748b">%</text>
        <text x={W - MR + 8} y={MT - 10} fontSize="11" fill="#8a6a22">{idioma === 'en' ? 'Cumulative €' : 'Acumulado €'}</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-6 text-xs text-slate-600">
        <span><b className="text-emerald-600">■</b> {idioma === 'en' ? 'Monthly return (%)' : 'Rentabilidad del mes (%)'}</span>
        <span><b className="text-[#c9a24a]">━━</b> {idioma === 'en' ? 'Cumulative gain (€)' : 'Ganancia acumulada (€)'}</span>
      </div>
    </div>
  );
}
