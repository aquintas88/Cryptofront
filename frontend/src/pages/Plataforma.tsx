import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { fecha } from '../components/formato';

// Zona de superadmin: historial de cargas de datos de todas las empresas.
export default function Plataforma() {
  const q = useQuery({ queryKey: ['cargas-plataforma'], queryFn: api.cargasPlataforma });
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between bg-[#07152b] px-6 py-4 text-white">
        <span className="font-serif text-lg">Plataforma · cargas de datos</span>
        <button onClick={api.salir} className="rounded border border-white/40 px-3 py-1 text-xs">Salir</button>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        {q.isError && <p className="text-sm text-red-700">No se pudo cargar el historial.</p>}
        <section className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2">Fecha</th><th>Empresa</th><th>Origen</th><th>Estado</th>
                <th className="text-right">Recibidas</th><th className="text-right">Aceptadas</th><th>Incidencia</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.cargas.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="py-2">{fecha(c.fechaCarga)}</td>
                  <td>{c.tenant.nombre}</td>
                  <td className="text-slate-600">{c.origen}</td>
                  <td>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.estado === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{c.estado}</span>
                  </td>
                  <td className="text-right">{c.filasRecibidas.toLocaleString('es-ES')}</td>
                  <td className="text-right">{c.filasAceptadas.toLocaleString('es-ES')}</td>
                  <td className="text-slate-600">{c.erroresResumen ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
