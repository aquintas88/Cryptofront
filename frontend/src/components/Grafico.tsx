import { useMemo, useRef, useState } from 'react';
import type { PuntoSerie } from '../lib/api';
import { eur } from './formato';

// Gráfico interactivo sin dependencias: ejes de dinero y fecha, cursor con panel de datos,
// navegación con ratón, dedo o flechas del teclado. La línea se dibuja al cargar.
const W = 900, H = 360, ML = 76, MR = 24, MT = 24, MB = 40;

const corto = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`;
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10_000 ? 0 : 1)} k€`;
  return `${Math.round(n)} €`;
};
const mes = (f: string) => new Date(f).toLocaleDateString('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const dia = (f: string) => new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function Grafico({ datos }: { datos: PuntoSerie[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activo, setActivo] = useState<number | null>(null);

  const escala = useMemo(() => {
    if (datos.length < 2) return null;
    const todos = datos.flatMap((d) => [d.valor, d.capitalAportado]);
    const min0 = Math.min(...todos), max0 = Math.max(...todos);
    const pad = (max0 - min0) * 0.08 || 1;
    const min = Math.max(0, min0 - pad), max = max0 + pad;
    const x = (i: number) => ML + (i / (datos.length - 1)) * (W - ML - MR);
    const y = (v: number) => H - MB - ((v - min) / (max - min)) * (H - MT - MB);
    const ticksY = Array.from({ length: 5 }, (_, k) => min + ((max - min) * k) / 4);
    const nTicksX = Math.min(6, datos.length);
    const ticksX = Array.from({ length: nTicksX }, (_, k) => Math.round((k * (datos.length - 1)) / (nTicksX - 1)));
    return { x, y, ticksY, ticksX };
  }, [datos]);

  if (!escala) return <p className="py-16 text-center text-sm text-slate-500">Sin datos en este periodo.</p>;
  const { x, y, ticksY, ticksX } = escala;

  const linea = (campo: 'valor' | 'capitalAportado') =>
    datos.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[campo]).toFixed(1)}`).join(' ');
  const area = `${linea('valor')} L${x(datos.length - 1)},${H - MB} L${x(0)},${H - MB} Z`;

  function indiceDesde(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const fraccion = (clientX - r.left) / r.width * W;
    const i = Math.round(((fraccion - ML) / (W - ML - MR)) * (datos.length - 1));
    setActivo(Math.min(datos.length - 1, Math.max(0, i)));
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); setActivo((a) => Math.min(datos.length - 1, (a ?? 0) + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setActivo((a) => Math.max(0, (a ?? datos.length) - 1)); }
    if (e.key === 'Escape') setActivo(null);
  }

  const p = activo !== null ? datos[activo] : null;
  const beneficio = p ? p.valor - p.capitalAportado : 0;

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-5">
        {p && activo !== null ? (
          <>
            <div className="col-span-2 md:col-span-1"><p className="text-xs text-slate-500">Fecha</p><p className="font-semibold text-[#0d2240]">{dia(p.fecha)}</p></div>
            <div><p className="text-xs text-slate-500">Valor</p><p className="font-semibold text-[#0d2240]">{eur(p.valor)}</p></div>
            <div><p className="text-xs text-slate-500">Capital aportado</p><p className="font-semibold">{eur(p.capitalAportado)}</p></div>
            <div><p className="text-xs text-slate-500">Beneficio</p><p className={`font-semibold ${beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{beneficio >= 0 ? '+' : ''}{eur(beneficio)}</p></div>
            <div><p className="text-xs text-slate-500">Rentabilidad</p><p className="font-semibold">{p.capitalAportado ? `${(beneficio / p.capitalAportado * 100).toFixed(1)} %` : '—'}</p></div>
          </>
        ) : (
          <p className="col-span-2 text-slate-500 md:col-span-5">Pase el cursor sobre la gráfica o use ← → para ver los datos de cada fecha.</p>
        )}
      </div>
      <div>
        <svg
          ref={svgRef}
          key={`${datos[0].fecha}-${datos.length}`}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24a]"
          role="img"
          tabIndex={0}
          aria-label="Gráfico de evolución: valor de la inversión frente al capital aportado. Usa las flechas para recorrer las fechas."
          onPointerMove={(e) => indiceDesde(e.clientX)}
          onPointerDown={(e) => indiceDesde(e.clientX)}
          onPointerLeave={() => setActivo(null)}
          onKeyDown={teclado}
          onBlur={() => setActivo(null)}
        >
          <defs>
            <linearGradient id="gr-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#c9a24a" stopOpacity=".28" />
              <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticksY.map((v, k) => (
            <g key={`y${k}`}>
              <line x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} stroke="#0d2240" strokeOpacity=".08" />
              <text x={ML - 10} y={y(v) + 4} textAnchor="end" fontSize="13" fill="#64748b">{corto(v)}</text>
            </g>
          ))}
          {ticksX.map((i) => (
            <text key={`x${i}`} x={x(i)} y={H - 12} textAnchor={i === 0 ? 'start' : i === datos.length - 1 ? 'end' : 'middle'} fontSize="13" fill="#64748b">
              {mes(datos[i].fecha)}
            </text>
          ))}

          <path d={area} fill="url(#gr-area)" />
          <path d={linea('capitalAportado')} fill="none" stroke="#8b93a1" strokeDasharray="6 5" strokeWidth="2" />
          <path d={linea('valor')} fill="none" stroke="#0d2240" strokeWidth="3" pathLength={1} className="trazo-linea" strokeLinejoin="round" />

          {p && activo !== null && (
            <g>
              <line x1={x(activo)} x2={x(activo)} y1={MT} y2={H - MB} stroke="#c9a24a" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx={x(activo)} cy={y(p.capitalAportado)} r="5" fill="#fff" stroke="#8b93a1" strokeWidth="2" />
              <circle cx={x(activo)} cy={y(p.valor)} r="7" fill="#0d2240" stroke="#c9a24a" strokeWidth="3" />
            </g>
          )}
        </svg>

      </div>
      <div className="mt-3 flex flex-wrap gap-6 text-xs text-slate-600">
        <span><b className="text-[#0d2240]">━━</b> Valor de su inversión</span>
        <span><b className="text-slate-400">- - -</b> Capital aportado</span>
      </div>
    </div>
  );
}
