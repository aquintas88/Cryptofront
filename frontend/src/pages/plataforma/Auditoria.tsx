import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type RegistroAuditoria } from '../../lib/api';
import { fechaHora } from '../../components/formato';
import { Table, Pagination, type Column } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { sortBy, useSortable } from '../../components/ui/tabla';

const POR_PAGINA = 20;
const ENTIDADES = ['Usuario', 'Sesion', 'MovimientoInversion', 'CargaInversion', 'PosicionInversion', 'Tenant'];
const ACCIONES = ['CREAR', 'EDITAR', 'BORRAR', 'EVENTO'];
const ETIQUETA_ENTIDAD: Record<string, string> = {
  Usuario: 'Cuenta', Sesion: 'Acceso', MovimientoInversion: 'Movimiento', CargaInversion: 'Carga', PosicionInversion: 'Posición', Tenant: 'Empresa',
};

// Resumen legible de los cambios: sin valores sensibles (la auditoría ya los excluye).
function resumen(cambios: unknown): string {
  if (!cambios || typeof cambios !== 'object') return '—';
  return Object.entries(cambios as Record<string, unknown>)
    .map(([k, v]) => (v && typeof v === 'object' && 'antes' in (v as object) ? `${k}: ${JSON.stringify((v as { antes: unknown }).antes)} → ${JSON.stringify((v as { despues: unknown }).despues)}` : `${k}: ${String(v)}`))
    .join(' · ');
}

export default function Auditoria() {
  const [filtros, setFiltros] = useState({ entidad: '', accion: '', desde: '', hasta: '' });
  const q = useQuery({ queryKey: ['auditoria', filtros], queryFn: () => api.plataforma.auditoria(filtros) });
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  const [texto, setTexto] = useState('');
  const { sort, toggle } = useSortable<'creadoEn' | 'actor' | 'entidad' | 'accion'>('creadoEn', 'desc');
  const filasBase = (q.data?.registros ?? []).map((r) => ({
    ...r,
    actorTexto: r.actor ? `${r.actor.nombre} ${r.actor.email}` : 'Sistema',
    entidadTexto: ETIQUETA_ENTIDAD[r.entidad] ?? r.entidad,
    detalle: resumen(r.cambios),
  }));
  const filtradas = filasBase.filter((r) => {
    const t = texto.trim().toLowerCase();
    return !t || `${r.actorTexto} ${r.entidadTexto} ${r.accion} ${r.detalle}`.toLowerCase().includes(t);
  });
  const filas = sortBy(filtradas, sort.field as keyof (typeof filtradas)[number], sort.dir);
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const visibles = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const columnas: Column<(typeof visibles)[number]>[] = [
    { key: 'creadoEn', header: 'Fecha y hora', sortable: true, render: (r) => fechaHora(r.creadoEn) },
    { key: 'actor', header: 'Quién', sortable: true, render: (r) => r.actor ? `${r.actor.nombre} (${r.actor.email})` : 'Sistema' },
    { key: 'entidad', header: 'Qué', sortable: true, render: (r) => r.entidadTexto },
    { key: 'accion', header: 'Acción', sortable: true },
    { key: 'detalle', header: 'Detalle', className: 'max-w-md truncate text-slate-600' },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64"><Input label="Buscar" placeholder="Quién, qué o detalle" value={texto} onChange={(e) => { setTexto(e.target.value); setPagina(1); }} /></div>
        <select value={filtros.entidad} onChange={(e) => { setFiltros({ ...filtros, entidad: e.target.value }); setPagina(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todo tipo</option>
          {ENTIDADES.map((x) => <option key={x} value={x}>{ETIQUETA_ENTIDAD[x]}</option>)}
        </select>
        <select value={filtros.accion} onChange={(e) => { setFiltros({ ...filtros, accion: e.target.value }); setPagina(1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Toda acción</option>
          {ACCIONES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <label className="text-xs text-slate-500">Desde<input type="date" value={filtros.desde} onChange={(e) => { setFiltros({ ...filtros, desde: e.target.value }); setPagina(1); }} className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm" /></label>
        <label className="text-xs text-slate-500">Hasta<input type="date" value={filtros.hasta} onChange={(e) => { setFiltros({ ...filtros, hasta: e.target.value }); setPagina(1); }} className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm" /></label>
      </div>
      <div className="flex justify-end">
        <button onClick={async () => {
          try {
            const blob = await api.plataforma.auditoriaXlsx(filtros);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'auditoria-cryptofront.xlsx'; a.click();
            URL.revokeObjectURL(url);
          } catch (err) { setErrorExport(err instanceof Error ? err.message : 'No se pudo exportar'); }
        }} className="rounded-full border border-[#07152b] px-4 py-2 text-sm font-semibold text-[#07152b]">Exportar a Excel</button>
      </div>
      {errorExport && <p role="alert" className="text-sm text-red-700">{errorExport}</p>}
      {q.isError && <p className="text-sm text-red-700">No se pudo cargar la auditoría.</p>}
      <Table columns={columnas} data={visibles} keyExtractor={(r) => r.id} onRowClick={setDetalle} sortKey={sort.field} sortDir={sort.dir} onSort={(k) => { toggle(k as typeof sort.field); setPagina(1); }} emptyMessage="Sin registros con esos filtros" />
      <Pagination page={pagina} totalPages={totalPaginas} onPage={setPagina} total={filas.length} />

      {detalle && (
        <Modal titulo="Registro de auditoría" onCerrar={() => setDetalle(null)}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Fecha y hora</dt><dd>{fechaHora(detalle.creadoEn)}</dd>
            <dt className="text-slate-500">Quién</dt><dd>{detalle.actor ? `${detalle.actor.nombre} (${detalle.actor.email})` : 'Sistema'}</dd>
            <dt className="text-slate-500">Qué</dt><dd>{ETIQUETA_ENTIDAD[detalle.entidad] ?? detalle.entidad} {detalle.entidadId ? `· ${detalle.entidadId}` : ''}</dd>
            <dt className="text-slate-500">Acción</dt><dd>{detalle.accion}</dd>
          </dl>
          <pre className="mt-4 overflow-x-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(detalle.cambios ?? {}, null, 2)}</pre>
        </Modal>
      )}
    </section>
  );
}
