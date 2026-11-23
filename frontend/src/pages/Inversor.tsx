import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import Grafico from '../components/Grafico';
import { eur, pct, fecha, mesLargo, NOMBRE_PRODUCTO, TIPO_MOVIMIENTO } from '../components/formato';

const ESTRATEGIAS = [
  { id: null, nombre: 'Todo' },
  { id: 'BOT_TRADING', nombre: 'Bot de trading' },
  { id: 'PROYECTO_CRYPTO', nombre: 'Proyecto crypto' },
  { id: 'TOKEN_SHARE', nombre: 'Share (token)' },
];
const PERIODOS = [{ id: '6m', nombre: '6 meses' }, { id: '1a', nombre: '1 año' }, { id: 'todo', nombre: 'Todo' }];

export default function Inversor() {
  const usuario = useSesion((s) => s.usuario);
  const cerrar = api.salir;
  const [producto, setProducto] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('1a');
  const resumen = useQuery({ queryKey: ['resumen'], queryFn: api.resumenInversor });
  const serie = useQuery({ queryKey: ['serie', producto, periodo], queryFn: () => api.serie(producto, periodo) });
  const movs = useQuery({ queryKey: ['movimientos'], queryFn: api.movimientos });
  const renta = useQuery({ queryKey: ['rentabilidad'], queryFn: api.rentabilidad });
  const r = resumen.data;

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#0d2240]">
      <header className="flex items-center justify-between bg-[#0d2240] px-6 py-4 text-white">
        <span className="font-serif text-xl tracking-wide">CRYPTOFRONT <span className="text-xs text-[#c9a24a]">ASSET MANAGEMENT</span></span>
        <nav className="flex items-center gap-6 text-sm">
          <span className="border-b-2 border-[#c9a24a] pb-1">Mi patrimonio</span>
          <span className="opacity-70">Movimientos</span>
          <span className="opacity-70">Informes</span>
          <span className="opacity-70">Ayuda</span>
          <span className="rounded-full bg-[#c9a24a] px-2.5 py-1 text-xs font-bold text-[#0d2240]">
            {usuario?.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </span>
          <button onClick={cerrar} className="rounded border border-[#c9a24a] px-3 py-1 text-xs text-[#c9a24a]">Salir</button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-3xl">Bienvenido/a, <i className="text-[#b08a3e]">{usuario?.nombre}</i></h1>
          {r && <span className="text-xs text-slate-500">Datos actualizados: {fecha(r.datosActualizadosEn)}</span>}
        </div>

        {resumen.isError && <p className="rounded bg-red-50 p-3 text-sm text-red-700">No se pudo cargar tu resumen.</p>}
        {r && (
          <section className="rounded-xl bg-[#0d2240] p-6 text-white">
            <p className="text-xs tracking-widest opacity-70">SU PATRIMONIO HOY</p>
            <div className="mt-2 flex flex-wrap items-center gap-8">
              <span className="font-serif text-5xl">{eur(r.patrimonio)}</span>
              <span className="rounded bg-[#c9a24a] px-3 py-1 font-semibold text-[#0d2240]">{pct(r.roiPct)}</span>
              <span className="text-sm opacity-80">Ha ganado {eur(r.ganancia)} desde que empezó</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-sm md:grid-cols-4">
              <div><p className="opacity-70">Capital aportado</p><p className="font-serif text-xl text-[#c9a24a]">{eur(r.capitalAportado)}</p></div>
              <div><p className="opacity-70">Ganado este mes</p><p className="font-serif text-xl text-emerald-300">{eur(r.gananciaMes)}</p></div>
              <div><p className="opacity-70">Estrategias activas</p><p className="font-serif text-xl">{r.estrategiasActivas}</p></div>
              <div><p className="opacity-70">Cliente desde</p><p className="font-serif text-xl text-[#c9a24a]">{r.clienteDesde ? fecha(r.clienteDesde) : '—'}</p></div>
            </div>
          </section>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-xl">Evolución de su inversión</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {ESTRATEGIAS.map((e) => (
                <button key={e.nombre} onClick={() => setProducto(e.id)}
                  className={`rounded border px-3 py-1 ${producto === e.id ? 'border-[#0d2240] bg-[#0d2240] text-white' : 'border-slate-300'}`}>{e.nombre}</button>
              ))}
              <span className="mx-2 text-slate-300">|</span>
              {PERIODOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodo(p.id)}
                  className={`rounded border px-3 py-1 ${periodo === p.id ? 'border-[#0d2240] bg-[#0d2240] text-white' : 'border-slate-300'}`}>{p.nombre}</button>
              ))}
            </div>
          </div>
          <div className="mt-4">{serie.data && <Grafico datos={serie.data.datos} />}</div>
        </section>

        {r && (
          <section className="grid gap-4 md:grid-cols-3">
            {r.porProducto.filter((p) => p.posiciones > 0).map((p) => (
              <div key={p.producto} className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-xs tracking-widest text-slate-500">{NOMBRE_PRODUCTO[p.producto].toUpperCase()}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-serif text-2xl">{eur(p.valor)}</span>
                  <span className="text-sm font-semibold text-emerald-700">{pct(p.roiPct)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Aportado: {eur(p.aportado)}</p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl">Rentabilidad mensual y acumulada</h2>
              {renta.data && (
                <p className="mt-1 text-sm text-slate-600">
                  {renta.data.ultimaCarga
                    ? <>Datos actualizados hasta el <b>{fecha(renta.data.ultimaCarga)}</b>. Próxima actualización prevista: <b>{renta.data.proximaCarga ? fecha(renta.data.proximaCarga) : '—'}</b> (carga {renta.data.frecuencia}).</>
                    : 'Aún no hay cargas de datos para su cartera.'}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th className="py-2">Mes</th><th className="text-right">Rentabilidad del mes</th><th className="text-right">Acumulada</th><th className="text-right">Valor a fin de mes</th></tr>
              </thead>
              <tbody>
                {renta.data?.meses.slice().reverse().map((m) => (
                  <tr key={m.mes} className="border-t border-slate-100">
                    <td className="py-2">{mesLargo(m.mes)}
                      {m.parcial && <span className="ml-2 rounded bg-[#c9a24a]/20 px-2 py-0.5 text-xs text-[#8a6a22]">en curso</span>}</td>
                    <td className={`text-right font-medium ${m.rentabilidadPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{pct(m.rentabilidadPct)}</td>
                    <td className={`text-right ${m.acumuladaPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{pct(m.acumuladaPct)}</td>
                    <td className="text-right">{eur(m.valorFin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl">Últimos movimientos</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th className="py-1">Fecha</th><th>Estrategia</th><th>Tipo</th><th className="text-right">Importe</th></tr>
              </thead>
              <tbody>
                {movs.data?.datos.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-1.5">{fecha(m.fecha)}</td>
                    <td>{NOMBRE_PRODUCTO[m.producto]}</td>
                    <td>{TIPO_MOVIMIENTO[m.tipo] ?? m.tipo}</td>
                    <td className={`text-right ${m.tipo === 'RETIRADA' ? 'text-red-700' : 'text-emerald-700'}`}>
                      {m.tipo === 'RETIRADA' ? '−' : '+'}{eur(m.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl">Sus informes</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {['Informe mensual', 'Informe trimestral', 'Resumen para la renta'].map((t) => (
                <li key={t} className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>{t}</span>
                  <span className="rounded border border-[#c9a24a] px-2 py-0.5 text-xs text-[#b08a3e]">Próximamente</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0d2240] p-6 text-white">
          <div>
            <h2 className="font-serif text-xl">¿Tiene alguna duda?</h2>
            <p className="text-sm opacity-80">Nuestro equipo le atenderá y resolverá cualquier consulta sobre su inversión.</p>
          </div>
          <a href="https://wa.me/34615608565" className="rounded bg-[#c9a24a] px-5 py-2.5 text-sm font-bold text-[#0d2240]">ESCRIBIR POR WHATSAPP</a>
        </section>

        <p className="text-xs text-slate-500">
          Información facilitada por el gestor con fines exclusivamente informativos, no auditada. Las rentabilidades pasadas no garantizan rentabilidades futuras.
        </p>
      </main>
    </div>
  );
}
