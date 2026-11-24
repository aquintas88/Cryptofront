import type { ResumenInversores } from '../lib/api';

// Altas y bajas por mes (barras, eje izquierdo) y total de inversores (línea, eje derecho).
// Las etiquetas de mes van justo debajo de las barras, y ambos ejes muestran sus valores.
const W = 900, H = 340, ML = 56, MR = 56, MT = 26, MB = 40;

export function GraficoEvolucionInversores({ evolucion }: { evolucion: ResumenInversores['evolucion'] }) {
  if (evolucion.length === 0) return <p className="py-10 text-center text-sm text-slate-500">Sin movimientos de inversores todavía.</p>;
  const n = evolucion.length;
  const ancho = (W - ML - MR) / n;
  const maxAltas = Math.max(1, ...evolucion.map((e) => e.altas));
  const maxBajas = Math.max(1, ...evolucion.map((e) => e.bajas));
  const maxTotal = Math.max(1, ...evolucion.map((e) => e.total));
  // Reparto vertical: la mitad superior para altas, la inferior para bajas; la línea usa todo el alto.
  const areaUtil = H - MT - MB;
  const cero = MT + (areaUtil * maxAltas) / (maxAltas + maxBajas);
  const alturaArriba = (areaUtil * maxAltas) / (maxAltas + maxBajas);
  const alturaAbajo = (areaUtil * maxBajas) / (maxAltas + maxBajas);
  const escalaAltas = alturaArriba / maxAltas;
  const escalaBajas = alturaAbajo / maxBajas;
  const yTotal = (v: number) => MT + (maxTotal - v) / maxTotal * areaUtil;
  const x = (i: number) => ML + ancho * i + ancho / 2;
  const puntos = evolucion.map((e, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yTotal(e.total).toFixed(1)}`).join(' ');
  const etiqueta = (mes: string) => new Date(mes + '-01T00:00:00Z').toLocaleDateString('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const yEtiquetas = cero + alturaAbajo + 18;
  const saltoX = Math.max(1, Math.ceil(n / 12));
  const ticksTotal = [0, maxTotal / 2, maxTotal].map((v) => Math.round(v));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Altas, bajas y total de inversores por mes">
        {/* Eje izquierdo: altas (arriba) y bajas (abajo) */}
        <line x1={ML} x2={W - MR} y1={cero} y2={cero} stroke="#0d2240" strokeOpacity=".3" />
        {[maxAltas, Math.round(maxAltas / 2)].map((v) => (
          <text key={`a${v}`} x={ML - 8} y={cero - v * escalaAltas + 4} textAnchor="end" fontSize="11" fill="#059669">{v}</text>
        ))}
        {[maxBajas].map((v) => (
          <text key={`b${v}`} x={ML - 8} y={cero + v * escalaBajas + 4} textAnchor="end" fontSize="11" fill="#dc2626">−{v}</text>
        ))}
        {/* Eje derecho: total */}
        {ticksTotal.map((v) => (
          <text key={`t${v}`} x={W - MR + 8} y={yTotal(v) + 4} fontSize="11" fill="#8a6a22">{v}</text>
        ))}

        {evolucion.map((e, i) => (
          <g key={e.mes}>
            {e.altas > 0 && <rect x={x(i) - ancho * 0.28} y={cero - e.altas * escalaAltas} width={ancho * 0.56} height={e.altas * escalaAltas} fill="#10b981" rx={2}><title>{`Altas: ${e.altas}`}</title></rect>}
            {e.bajas > 0 && <rect x={x(i) - ancho * 0.28} y={cero} width={ancho * 0.56} height={e.bajas * escalaBajas} fill="#ef4444" rx={2}><title>{`Bajas: ${e.bajas}`}</title></rect>}
            {i % saltoX === 0 && <text x={x(i)} y={yEtiquetas} textAnchor="middle" fontSize="11" fill="#64748b">{etiqueta(e.mes)}</text>}
          </g>
        ))}
        <path d={puntos} fill="none" stroke="#c9a24a" strokeWidth="2.5" />
        {evolucion.map((e, i) => <circle key={`c${e.mes}`} cx={x(i)} cy={yTotal(e.total)} r={3.5} fill="#c9a24a"><title>{`Total: ${e.total}`}</title></circle>)}
      </svg>
      <div className="mt-2 flex flex-wrap gap-6 text-xs text-slate-600">
        <span><b className="text-emerald-600">■</b> Altas (eje izquierdo)</span>
        <span><b className="text-red-500">■</b> Bajas (eje izquierdo)</span>
        <span><b className="text-[#c9a24a]">━━</b> Total de inversores (eje derecho)</span>
      </div>
    </div>
  );
}
