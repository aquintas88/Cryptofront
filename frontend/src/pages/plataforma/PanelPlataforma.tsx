import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, panelPlataforma, panelInversores, resumenInversores } from '../../lib/api';
import { PanelInversion } from '../../components/PanelInversion';
import { GraficoEvolucionInversores } from '../../components/GraficoEvolucionInversores';
import { Combobox } from '../../components/ui/Combobox';

const ETIQUETA_CATEGORIA: Record<string, string> = { BOT_TRADING: 'Bot de trading', PROYECTO_CRYPTO: 'Proyecto crypto', TOKEN_SHARE: 'Share (token)' };

// Panel de inversiones de la plataforma: acumulado de una empresa o filtrado por un inversor.
export default function PanelPlataforma() {
  const empresas = useQuery({ queryKey: ['empresas-plataforma'], queryFn: api.plataforma.empresas });
  const [empresa, setEmpresa] = useState<string>('');
  const [inversor, setInversor] = useState<string>('');
  const empresaActiva = empresa || empresas.data?.empresas[0]?.id || '';
  const inversores = useQuery({
    queryKey: ['panel-inversores', empresaActiva],
    queryFn: () => panelInversores(empresaActiva),
    enabled: Boolean(empresaActiva),
  });
  const resumen = useQuery({
    queryKey: ['panel-resumen-inversores', empresaActiva],
    queryFn: () => resumenInversores(empresaActiva),
    enabled: Boolean(empresaActiva) && !inversor,
  });
  const nombreEmpresa = empresas.data?.empresas.find((e) => e.id === empresaActiva)?.nombre ?? '';
  const nombreInversor = inversores.data?.inversores.find((i) => i.id === inversor)?.nombre;

  if (!empresaActiva) return <p className="text-sm text-slate-500">Cargando empresas…</p>;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72">
          <Combobox
            label="Empresa"
            value={empresaActiva}
            onChange={(v) => { setEmpresa(v); setInversor(''); }}
            options={(empresas.data?.empresas ?? []).map((e) => ({ value: e.id, label: e.nombre }))}
          />
        </div>
        <div className="w-80">
          <Combobox
            label="Inversor"
            value={inversor}
            onChange={setInversor}
            clearable
            placeholder="Buscar inversor…"
            options={[
              { value: '', label: 'Acumulado de la empresa' },
              ...(inversores.data?.inversores ?? []).map((i) => ({ value: i.id, label: `${i.nombre}${i.activo ? '' : ' (desactivado)'}` })),
            ]}
          />
        </div>
      </div>

      <PanelInversion
        key={`${empresaActiva}-${inversor}`}
        clave={`panel-${empresaActiva}-${inversor || 'todos'}`}
        fuentes={panelPlataforma(empresaActiva, inversor || null)}
        idioma="es"
        titulo={inversor ? `Panel de ${nombreInversor ?? 'inversor'}` : `Acumulado · ${nombreEmpresa}`}
        cabeceraExtra={<p className="text-xs text-slate-500">Vista de superadmin. Las consultas de un inversor concreto quedan registradas en la auditoría.</p>}
      />

      {!inversor && resumen.data && (
        <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl">Inversores de {nombreEmpresa}</h2>
            <p className="text-sm text-slate-600">Total: <b>{resumen.data.totalInversores}</b> · activos en cuenta: <b>{resumen.data.activos}</b></p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {resumen.data.porCategoria.map((c) => (
              <div key={c.producto} className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs tracking-widest text-slate-500">{ETIQUETA_CATEGORIA[c.producto].toUpperCase()}</p>
                <p className="mt-1 font-serif text-3xl">{c.inversoresActivos}</p>
                <p className="text-xs text-slate-500">inversores con posición activa</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Altas, bajas y evolución del total</h3>
            <GraficoEvolucionInversores evolucion={resumen.data.evolucion} />
          </div>
        </section>
      )}

    </section>
  );
}
