import type { ResumenInversores } from '../lib/api';

// Altas y bajas por mes (barras) y total de inversores (línea), para la plataforma.
const W = 900, H = 320, ML = 56, MR = 24, MT = 24, MB = 44;

export function GraficoEvolucionInversores({ evolucion }: { evolucion: ResumenInversores['evolucion'] }) {
  if (evolucion.length === 0) return <p className="py-10 text-center text-sm text-slate-500">Sin movimientos de inversores todavía.</p>;
  const n = evolucion.length;
  const ancho = (W - ML - MR) / n;
  const maxBarra = Math.max(1, ...evolucion.map((e) => Math.max(e.altas, e.bajas)));
  const maxTotal = Math.max(1, ...evolucion.map((e) => e.total));
  const cero = MT + (H - MT - MB) / 2;
  const escalaBarra = (H - MT - MB) / 2 / maxBarra;
  const yTotal = (v: number) => MT + (maxTotal - v) / maxTotal * (H - MT - MB);
  const x = (i: number) => ML + ancho * i + ancho / 2;
  const puntos = evolucion.map((e, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yTotal(e.total).toFixed(1)}`).join(' ');
  const etiqueta = (mes: string) => new Date(mes + '-01T00:00:00Z').toLocaleDateString('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Altas, bajas y total de inversores por mes">
        <line x1={ML} x2={W - MR} y1={cero} y2={cero} stroke="#0d2240" strokeOpacity=".25" />
        {evolucion.map((e, i) => (
          <g key={e.mes}>
            {e.altas > 0 && <rect x={x(i) - ancho * 0.28} y={cero - e.altas * escalaBarra} width={ancho * 0.56} height={e.altas * escalaBarra} fill="#10b981" rx={2}><title>{`Altas: ${e.altas}`}</title></rect>}
            {e.bajas > 0 && <rect x={x(i) - ancho * 0.28} y={cero} width={ancho * 0.56} height={e.bajas * escalaBarra} fill="#ef4444" rx={2}><title>{`Bajas: ${e.bajas}`}</title></rect>}
            <text x={x(i)} y={H - 14} textAnchor="middle" fontSize="11" fill="#64748b">{etiqueta(e.mes)}</text>
          </g>
        ))}
        <path d={puntos} fill="none" stroke="#c9a24a" strokeWidth="2.5" />
        {evolucion.map((e, i) => <circle key={`c${e.mes}`} cx={x(i)} cy={yTotal(e.total)} r={3.5} fill="#c9a24a"><title>{`Total: ${e.total}`}</title></circle>)}
        {evolucion.map((e, i) => (i === n - 1 || i % Math.ceil(n / 8) === 0) ? <text key={`t${e.mes}`} x={x(i)} y={yTotal(e.total) - 9} textAnchor="middle" fontSize="11" fill="#8a6a22">{e.total}</text> : null)}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6 text-xs text-slate-600">
        <span><b className="text-emerald-600">■</b> Altas</span>
        <span><b className="text-red-500">■</b> Bajas</span>
        <span><b className="text-[#c9a24a]">━━</b> Total de inversores</span>
      </div>
    </div>
  );
}
