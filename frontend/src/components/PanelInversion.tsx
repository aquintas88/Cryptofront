import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ZONA } from '../lib/zona';
import type { Idioma } from '../web/textos';
import type { ResumenInversor, Rentabilidad, Movimiento, Producto } from '../lib/api';
import Grafico from './Grafico';
import { eur, pct, fecha, mesLargo } from './formato';
import { GraficoMensual } from './GraficoMensual';
import { Table, Pagination, type Column } from './ui/Table';
import { sortBy, useSortable } from './ui/tabla';
import { Input } from './ui/Input';

// Fuentes de datos del panel: el inversor usa sus propias consultas; la plataforma, las de un inversor
// concreto o las acumuladas de la empresa. Mismo panel en los dos casos.
export interface FuentesPanel {
  resumen: () => Promise<ResumenInversor>;
  serie: (producto: string | null, periodo: string) => Promise<{ datos: { fecha: string; valor: number; capitalAportado: number }[] }>;
  movimientos: () => Promise<{ datos: Movimiento[] }>;
  rentabilidad: () => Promise<Rentabilidad>;
}

const PRODUCTOS_FILTRO = [null, 'BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'] as const;
const PERIODOS_ID = ['6m', '1a', 'todo'] as const;

export function PanelInversion({ clave, fuentes, idioma, titulo, cabeceraExtra }: {
  clave: string;
  fuentes: FuentesPanel;
  idioma: Idioma;
  titulo: ReactNode;
  cabeceraExtra?: ReactNode;
}) {
  const z = ZONA[idioma];
  const [producto, setProducto] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('1a');
  const resumen = useQuery({ queryKey: [clave, 'resumen'], queryFn: fuentes.resumen });
  const serie = useQuery({ queryKey: [clave, 'serie', producto, periodo], queryFn: () => fuentes.serie(producto, periodo) });
  const movs = useQuery({ queryKey: [clave, 'movimientos'], queryFn: fuentes.movimientos });
  const renta = useQuery({ queryKey: [clave, 'rentabilidad'], queryFn: fuentes.rentabilidad });
  const r = resumen.data;

  // Filtro de periodo (año o rango de meses) para la gráfica y la tabla mensual.
  const [anio, setAnio] = useState<string>('todos');
  const [desdeMes, setDesdeMes] = useState<string>('');
  const [hastaMes, setHastaMes] = useState<string>('');
  const aniosDisponibles = useMemo(() => [...new Set((renta.data?.meses ?? []).map((m) => m.mes.slice(0, 4)))].sort(), [renta.data]);
  const mesesFiltrados = useMemo(() => (renta.data?.meses ?? []).filter((m) => {
    if (desdeMes && m.mes < desdeMes) return false;
    if (hastaMes && m.mes > hastaMes) return false;
    if (!desdeMes && !hastaMes && anio !== 'todos') return m.mes.startsWith(anio);
    return true;
  }), [renta.data, anio, desdeMes, hastaMes]);
  const mesesOrdenados = useMemo(() => [...mesesFiltrados].sort((a, b) => (a.mes < b.mes ? 1 : -1)), [mesesFiltrados]);
  const totalEurPeriodo = mesesFiltrados.reduce((acc, m) => acc + m.gananciaEur, 0);

  // Movimientos: filtros por tipo, producto y fechas; orden por columna; paginación.
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [productoFiltro, setProductoFiltro] = useState('');
  const [desdeFecha, setDesdeFecha] = useState('');
  const [hastaFecha, setHastaFecha] = useState('');
  const [pagMov, setPagMov] = useState(1);
  const { sort: sortMov, toggle: toggleMov } = useSortable<'fecha' | 'producto' | 'tipo' | 'importe'>('fecha', 'desc');
  const filasMov = useMemo(() => (movs.data?.datos ?? [])
    .filter((m) => (!tipoFiltro || m.tipo === tipoFiltro) && (!productoFiltro || m.producto === productoFiltro))
    .filter((m) => (!desdeFecha || m.fecha.slice(0, 10) >= desdeFecha) && (!hastaFecha || m.fecha.slice(0, 10) <= hastaFecha))
    .map((m) => ({ ...m, etiquetaTipo: z.tipoMovimiento[m.tipo] ?? m.tipo, etiquetaProducto: z.nombreProducto[m.producto] ?? m.producto })),
  [movs.data, tipoFiltro, productoFiltro, desdeFecha, hastaFecha, z]);
  const movOrdenados = sortBy(filasMov, sortMov.field as keyof (typeof filasMov)[number], sortMov.dir);
  const movPaginas = Math.max(1, Math.ceil(movOrdenados.length / 20));
  const movVisibles = movOrdenados.slice((pagMov - 1) * 20, pagMov * 20);
  const columnasMov: Column<(typeof filasMov)[number]>[] = [
    { key: 'fecha', header: z.colFecha, sortable: true, render: (m) => fecha(m.fecha, idioma) },
    { key: 'producto', header: z.colEstrategia, sortable: true, render: (m) => m.etiquetaProducto },
    { key: 'tipo', header: z.colTipo, sortable: true, render: (m) => m.etiquetaTipo },
    { key: 'importe', header: z.colImporte, sortable: true, className: 'text-right', render: (m) => (
      <span className={m.tipo === 'RETIRADA' ? 'text-red-700' : 'text-emerald-700'}>{m.tipo === 'RETIRADA' ? '−' : '+'}{eur(m.importe, idioma)}</span>
    ) },
  ];

  const columnasMeses: Column<NonNullable<typeof renta.data>['meses'][number]>[] = [
    { key: 'mes', header: z.colMes, render: (m) => (<>{mesLargo(m.mes, idioma)}{m.parcial && <span className="ml-2 rounded bg-[#c9a24a]/20 px-2 py-0.5 text-xs text-[#8a6a22]">{z.enCurso}</span>}</>) },
    { key: 'rentabilidadPct', header: z.colRentMes, className: 'text-right', render: (m) => <span className={`font-medium ${m.rentabilidadPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{pct(m.rentabilidadPct, idioma)}</span> },
    { key: 'gananciaEur', header: idioma === 'en' ? 'Gain (€)' : 'Ganancia (€)', className: 'text-right', render: (m) => eur(m.gananciaEur, idioma) },
    { key: 'acumuladaPct', header: z.colAcumulada, className: 'text-right', render: (m) => <span className={m.acumuladaPct >= 0 ? 'text-emerald-700' : 'text-red-700'}>{pct(m.acumuladaPct, idioma)}</span> },
    { key: 'valorFin', header: z.colValorFin, className: 'text-right', render: (m) => eur(m.valorFin, idioma) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl">{titulo}</h1>
        {r && <span className="text-xs text-slate-500">{z.datosActualizados}{fecha(r.datosActualizadosEn, idioma)}</span>}
      </div>
      {cabeceraExtra}

      {resumen.isError && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{z.errorResumen}</p>}
      {(serie.isError || renta.isError || movs.isError) && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          No se han podido cargar todos los datos del panel: {[resumen, serie, renta, movs].map((q) => q.error instanceof Error ? q.error.message : '').filter(Boolean)[0] ?? 'error de conexión'}. Recargue la página o vuelva a entrar.
        </p>
      )}
      {r && (
        <section className="rounded-xl bg-[#0d2240] p-6 text-white">
          <p className="text-xs tracking-widest opacity-70">{z.patrimonioHoy}</p>
          <div className="mt-2 flex flex-wrap items-center gap-8">
            <span className="font-serif text-5xl">{eur(r.patrimonio, idioma)}</span>
            <span className="rounded bg-[#c9a24a] px-3 py-1 font-semibold text-[#0d2240]">{pct(r.roiPct, idioma)}</span>
            <span className="text-sm opacity-80">{z.haGanado(eur(r.ganancia, idioma))}</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-sm md:grid-cols-4">
            <div><p className="opacity-70">{z.capitalAportado}</p><p className="font-serif text-xl text-[#c9a24a]">{eur(r.capitalAportado, idioma)}</p></div>
            <div><p className="opacity-70">{z.ganadoMes}</p><p className="font-serif text-xl text-emerald-300">{eur(r.gananciaMes, idioma)}</p></div>
            <div><p className="opacity-70">{z.estrategiasActivas}</p><p className="font-serif text-xl">{r.estrategiasActivas}</p></div>
            <div><p className="opacity-70">{z.clienteDesde}</p><p className="font-serif text-xl text-[#c9a24a]">{r.clienteDesde ? fecha(r.clienteDesde, idioma) : '—'}</p></div>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-serif text-xl">{z.evolucion}</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {PRODUCTOS_FILTRO.map((id, i) => (
              <button key={String(id)} onClick={() => setProducto(id)}
                className={`rounded border px-3 py-1 ${producto === id ? 'border-[#0d2240] bg-[#0d2240] text-white' : 'border-slate-300'}`}>{z.filtros[i]}</button>
            ))}
            <span className="mx-2 text-slate-300">|</span>
            {PERIODOS_ID.map((id, i) => (
              <button key={id} onClick={() => setPeriodo(id)}
                className={`rounded border px-3 py-1 ${periodo === id ? 'border-[#0d2240] bg-[#0d2240] text-white' : 'border-slate-300'}`}>{z.periodos[i]}</button>
            ))}
          </div>
        </div>
        <div className="mt-4">{serie.data && <Grafico datos={serie.data.datos} idioma={idioma} />}</div>
      </section>

      {r && (
        <section className="grid gap-4 md:grid-cols-3">
          {r.porProducto.filter((p) => p.posiciones > 0).map((p) => (
            <div key={p.producto} className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-xs tracking-widest text-slate-500">{z.nombreProducto[p.producto].toUpperCase()}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-serif text-2xl">{eur(p.valor, idioma)}</span>
                <span className="text-sm font-semibold text-emerald-700">{pct(p.roiPct, idioma)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{z.aportado}{eur(p.aportado, idioma)}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">{z.rentabilidadMensual}</h2>
            {renta.data && (
              <p className="mt-1 text-sm text-slate-600">
                {renta.data.ultimaCarga
                  ? z.datosHasta(fecha(renta.data.ultimaCarga, idioma), renta.data.proximaCarga ? fecha(renta.data.proximaCarga, idioma) : '—', z.frecuencia)
                  : z.sinCargas}
              </p>
            )}
            {renta.data?.rentabilidadAnualizadaPct != null && (
              <p className="mt-1 text-sm text-slate-700">
                {z.anualizada} <b className={renta.data.rentabilidadAnualizadaPct >= 0 ? 'text-emerald-700' : 'text-red-700'}>{pct(renta.data.rentabilidadAnualizadaPct, idioma)}</b>
                <span className="text-slate-500"> {z.anualizadaNota}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="text-xs text-slate-500">{idioma === 'en' ? 'Year' : 'Año'}
              <select value={anio} onChange={(e) => { setAnio(e.target.value); setDesdeMes(''); setHastaMes(''); }}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                <option value="todos">{idioma === 'en' ? 'All' : 'Todos'}</option>
                {aniosDisponibles.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <Input label={idioma === 'en' ? 'From (month)' : 'Desde (mes)'} type="month" value={desdeMes} onChange={(e) => { setDesdeMes(e.target.value); setAnio('todos'); }} />
            <Input label={idioma === 'en' ? 'To (month)' : 'Hasta (mes)'} type="month" value={hastaMes} onChange={(e) => { setHastaMes(e.target.value); setAnio('todos'); }} />
            <button onClick={() => { setAnio('todos'); setDesdeMes(''); setHastaMes(''); }} className="rounded border border-slate-300 px-3 py-2 text-xs">{idioma === 'en' ? 'Clear' : 'Limpiar'}</button>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          {idioma === 'en' ? 'Gain in the period:' : 'Ganancia del periodo:'} <b className={totalEurPeriodo >= 0 ? 'text-emerald-700' : 'text-red-700'}>{eur(totalEurPeriodo, idioma)}</b>
        </p>
        <GraficoMensual meses={mesesFiltrados} idioma={idioma} />
        <Table columns={columnasMeses} data={mesesOrdenados} keyExtractor={(m) => m.mes} emptyMessage={idioma === 'en' ? 'No months in this period' : 'Sin meses en este periodo'} />
      </section>

      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl">{z.ultimosMovimientos}</h2>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="text-xs text-slate-500">{z.colTipo}
            <select value={tipoFiltro} onChange={(e) => { setTipoFiltro(e.target.value); setPagMov(1); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">{idioma === 'en' ? 'All' : 'Todos'}</option>
              {Object.keys(z.tipoMovimiento).map((t) => <option key={t} value={t}>{z.tipoMovimiento[t]}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">{z.colEstrategia}
            <select value={productoFiltro} onChange={(e) => { setProductoFiltro(e.target.value); setPagMov(1); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">{idioma === 'en' ? 'All' : 'Todas'}</option>
              {Object.keys(z.nombreProducto).map((p) => <option key={p} value={p}>{z.nombreProducto[p]}</option>)}
            </select>
          </label>
          <Input label={idioma === 'en' ? 'From' : 'Desde'} type="date" value={desdeFecha} onChange={(e) => { setDesdeFecha(e.target.value); setPagMov(1); }} />
          <Input label={idioma === 'en' ? 'To' : 'Hasta'} type="date" value={hastaFecha} onChange={(e) => { setHastaFecha(e.target.value); setPagMov(1); }} />
        </div>
        <Table
          columns={columnasMov}
          data={movVisibles}
          keyExtractor={(m) => m.id}
          sortKey={sortMov.field}
          sortDir={sortMov.dir}
          onSort={(k) => { toggleMov(k as 'fecha' | 'producto' | 'tipo' | 'importe'); setPagMov(1); }}
          emptyMessage={idioma === 'en' ? 'No transactions' : 'Sin movimientos'}
        />
        <Pagination page={pagMov} totalPages={movPaginas} onPage={setPagMov} total={movOrdenados.length} />
      </section>

      <p className="text-xs text-slate-500">{z.aviso}</p>
    </div>
  );
}

export type { Producto };
