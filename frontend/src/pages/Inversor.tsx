import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { ZONA } from '../lib/zona';
import Grafico from '../components/Grafico';
import { eur, pct, fecha, mesLargo } from '../components/formato';
import type { Idioma } from '../web/textos';

const PRODUCTOS_FILTRO = [null, 'BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'] as const;
const PERIODOS_ID = ['6m', '1a', 'todo'] as const;

export default function Inversor() {
  const usuario = useSesion((s) => s.usuario);
  const idioma: Idioma = usuario?.idioma === 'en' ? 'en' : 'es';
  const z = ZONA[idioma];
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
          <span className="border-b-2 border-[#c9a24a] pb-1">{z.cabecera.patrimonio}</span>
          <span className="opacity-70">{z.cabecera.movimientos}</span>
          <span className="opacity-70">{z.cabecera.informes}</span>
          <span className="opacity-70">{z.cabecera.ayuda}</span>
          <span className="rounded-full bg-[#c9a24a] px-2.5 py-1 text-xs font-bold text-[#0d2240]">
            {usuario?.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </span>
          <button onClick={cerrar} className="rounded border border-[#c9a24a] px-3 py-1 text-xs text-[#c9a24a]">{z.cabecera.salir}</button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-3xl">{z.bienvenida}<i className="text-[#b08a3e]">{usuario?.nombre}</i></h1>
          {r && <span className="text-xs text-slate-500">{z.datosActualizados}{fecha(r.datosActualizadosEn, idioma)}</span>}
        </div>

        {resumen.isError && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{z.errorResumen}</p>}
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

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th className="py-2">{z.colMes}</th><th className="text-right">{z.colRentMes}</th><th className="text-right">{z.colAcumulada}</th><th className="text-right">{z.colValorFin}</th></tr>
              </thead>
              <tbody>
                {renta.data?.meses.slice().reverse().map((m) => (
                  <tr key={m.mes} className="border-t border-slate-100">
                    <td className="py-2">{mesLargo(m.mes, idioma)}
                      {m.parcial && <span className="ml-2 rounded bg-[#c9a24a]/20 px-2 py-0.5 text-xs text-[#8a6a22]">{z.enCurso}</span>}</td>
                    <td className={`text-right font-medium ${m.rentabilidadPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{pct(m.rentabilidadPct, idioma)}</td>
                    <td className={`text-right ${m.acumuladaPct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{pct(m.acumuladaPct, idioma)}</td>
                    <td className="text-right">{eur(m.valorFin, idioma)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl">{z.ultimosMovimientos}</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr><th className="py-1">{z.colFecha}</th><th>{z.colEstrategia}</th><th>{z.colTipo}</th><th className="text-right">{z.colImporte}</th></tr>
              </thead>
              <tbody>
                {movs.data?.datos.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-1.5">{fecha(m.fecha, idioma)}</td>
                    <td>{z.nombreProducto[m.producto]}</td>
                    <td>{z.tipoMovimiento[m.tipo] ?? m.tipo}</td>
                    <td className={`text-right ${m.tipo === 'RETIRADA' ? 'text-red-700' : 'text-emerald-700'}`}>
                      {m.tipo === 'RETIRADA' ? '−' : '+'}{eur(m.importe, idioma)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl">{z.informes}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {z.listaInformes.map((t) => (
                <li key={t} className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>{t}</span>
                  <span className="rounded border border-[#c9a24a] px-2 py-0.5 text-xs text-[#b08a3e]">{z.proximamente}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0d2240] p-6 text-white">
          <div>
            <h2 className="font-serif text-xl">{z.dudas}</h2>
            <p className="text-sm opacity-80">{z.dudasTexto}</p>
          </div>
          <a href="https://wa.me/34615608565" className="rounded bg-[#c9a24a] px-5 py-2.5 text-sm font-bold text-[#0d2240]">{z.whatsapp}</a>
        </section>

        <p className="text-xs text-slate-500">{z.aviso}</p>
      </main>
    </div>
  );
}
