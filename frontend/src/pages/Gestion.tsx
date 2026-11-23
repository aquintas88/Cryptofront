import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { eur, pct, NOMBRE_PRODUCTO } from '../components/formato';

// Panel de Adri: beneficios, ROI y comisiones por producto.
export default function Gestion() {
  const q = useQuery({ queryKey: ['gestion'], queryFn: api.resumenGestion });
  const g = q.data;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between bg-[#0d2240] px-6 py-4 text-white">
        <span className="font-serif text-lg">Panel de gestión · Cryptofront (pruebas)</span>
        <button onClick={api.salir} className="rounded border border-white/40 px-3 py-1 text-xs">Salir</button>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {q.isError && <p className="text-sm text-red-700">No se pudo cargar el panel.</p>}
        {g && (
          <>
            <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {[
                ['Inversores', String(g.inversores)],
                ['Capital aportado', eur(g.aportado)],
                ['Valor actual', eur(g.valor)],
                ['Beneficio', eur(g.beneficio)],
                ['ROI global', pct(g.roiPct)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="mt-1 text-xl font-semibold">{v}</p>
                </div>
              ))}
            </section>
            <section className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-2">Producto</th><th className="text-right">Inversores</th><th className="text-right">Posiciones</th>
                    <th className="text-right">Aportado</th><th className="text-right">Valor</th><th className="text-right">Retirado</th>
                    <th className="text-right">Comisiones</th><th className="text-right">Beneficio</th><th className="text-right">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {g.porProducto.map((p) => (
                    <tr key={p.producto} className="border-t border-slate-100">
                      <td className="py-2 font-medium">{NOMBRE_PRODUCTO[p.producto]}</td>
                      <td className="text-right">{p.inversores}</td>
                      <td className="text-right">{p.posiciones}</td>
                      <td className="text-right">{eur(p.aportado)}</td>
                      <td className="text-right">{eur(p.valor)}</td>
                      <td className="text-right">{eur(p.retirado)}</td>
                      <td className="text-right">{eur(p.comisiones)}</td>
                      <td className="text-right">{eur(p.beneficio)}</td>
                      <td className="text-right">{pct(p.roiPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
