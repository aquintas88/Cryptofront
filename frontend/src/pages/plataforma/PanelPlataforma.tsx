import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, panelPlataforma, panelInversores } from '../../lib/api';
import { PanelInversion } from '../../components/PanelInversion';

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
  const nombreEmpresa = empresas.data?.empresas.find((e) => e.id === empresaActiva)?.nombre ?? '';
  const nombreInversor = inversores.data?.inversores.find((i) => i.id === inversor)?.nombre;

  if (!empresaActiva) return <p className="text-sm text-slate-500">Cargando empresas…</p>;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">Empresa
          <select value={empresaActiva} onChange={(e) => { setEmpresa(e.target.value); setInversor(''); }}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
            {empresas.data?.empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Inversor
          <select value={inversor} onChange={(e) => setInversor(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
            <option value="">Acumulado de la empresa</option>
            {inversores.data?.inversores.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre}{i.activo ? '' : ' (desactivado)'}</option>
            ))}
          </select>
        </label>
      </div>
      <PanelInversion
        key={`${empresaActiva}-${inversor}`}
        clave={`panel-${empresaActiva}-${inversor || 'todos'}`}
        fuentes={panelPlataforma(empresaActiva, inversor || null)}
        idioma="es"
        titulo={inversor ? `Panel de ${nombreInversor ?? 'inversor'}` : `Acumulado · ${nombreEmpresa}`}
        cabeceraExtra={<p className="text-xs text-slate-500">Vista de superadmin. Las consultas de un inversor concreto quedan registradas en la auditoría.</p>}
      />
    </section>
  );
}
