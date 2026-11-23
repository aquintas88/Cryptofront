import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type CargaPlataforma } from '../../lib/api';
import { fechaHora } from '../../components/formato';
import { Table, Pagination, type Column } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { sortBy, useSortable } from '../../components/ui/tabla';

const POR_PAGINA = 20;
type Campo = 'fechaCarga' | 'tenant' | 'estado' | 'filasAceptadas';

// Historial de cargas de datos. La carga por Excel se activará cuando esté publicado el formato del fichero.
export default function Cargas() {
  const q = useQuery({ queryKey: ['cargas-plataforma'], queryFn: api.cargasPlataforma });
  const { sort, toggle } = useSortable<Campo>('fechaCarga', 'desc');
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<CargaPlataforma | null>(null);

  const filas = (q.data?.cargas ?? []).map((c) => ({ ...c, tenant: c.tenant.nombre }));
  const ordenadas = sortBy(filas, sort.field as keyof (typeof filas)[number], sort.dir);
  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const visibles = ordenadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const columnas: Column<(typeof filas)[number]>[] = [
    { key: 'fechaCarga', header: 'Fecha y hora', sortable: true, render: (c) => fechaHora(c.fechaCarga) },
    { key: 'tenant', header: 'Empresa', sortable: true },
    { key: 'origen', header: 'Origen', className: 'text-slate-600' },
    {
      key: 'estado', header: 'Estado', sortable: true,
      render: (c) => (
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.estado === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{c.estado}</span>
      ),
    },
    { key: 'filasRecibidas', header: 'Recibidas', className: 'text-right', render: (c) => c.filasRecibidas.toLocaleString('es-ES') },
    { key: 'filasAceptadas', header: 'Aceptadas', sortable: true, className: 'text-right', render: (c) => c.filasAceptadas.toLocaleString('es-ES') },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Historial de cargas de todas las empresas. Haga clic en una carga para ver su detalle.</p>
        <button disabled title="Disponible cuando se publique el formato del fichero Excel"
          className="rounded-full bg-[#07152b] px-4 py-2 text-sm font-semibold text-white opacity-50">
          Cargar Excel
        </button>
      </div>
      {q.isError && <p className="text-sm text-red-700">No se pudo cargar el historial.</p>}
      <Table
        columns={columnas}
        data={visibles}
        keyExtractor={(c) => c.id}
        sortKey={sort.field}
        sortDir={sort.dir}
        onSort={(k) => { toggle(k as Campo); setPagina(1); }}
        onRowClick={(c) => setDetalle(q.data?.cargas.find((x) => x.id === c.id) ?? null)}
        emptyMessage="Todavía no hay cargas"
      />
      <Pagination page={pagina} totalPages={totalPaginas} onPage={setPagina} total={ordenadas.length} />

      {detalle && (
        <Modal titulo="Detalle de la carga" onCerrar={() => setDetalle(null)}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-slate-500">Fecha y hora</dt><dd>{fechaHora(detalle.fechaCarga)}</dd>
            <dt className="text-slate-500">Empresa</dt><dd>{detalle.tenant.nombre}</dd>
            <dt className="text-slate-500">Origen</dt><dd>{detalle.origen}</dd>
            <dt className="text-slate-500">Estado</dt><dd>{detalle.estado}</dd>
            <dt className="text-slate-500">Filas recibidas</dt><dd>{detalle.filasRecibidas.toLocaleString('es-ES')}</dd>
            <dt className="text-slate-500">Filas aceptadas</dt><dd>{detalle.filasAceptadas.toLocaleString('es-ES')}</dd>
            <dt className="text-slate-500">Incidencias</dt><dd>{detalle.erroresResumen ?? 'Ninguna'}</dd>
          </dl>
        </Modal>
      )}
    </section>
  );
}
