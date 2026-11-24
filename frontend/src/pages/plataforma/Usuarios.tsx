import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CuentaPlataforma, type FichaInversor } from '../../lib/api';
import { eur, fecha, fechaHora, NOMBRE_PRODUCTO } from '../../components/formato';
import { Table, Pagination, type Column } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { sortBy, useSortable } from '../../components/ui/tabla';

const POR_PAGINA = 20;
const ROLES = ['INVERSOR', 'SUPERADMIN'];
const ETIQUETA_ROL: Record<string, string> = {
  INVERSOR: 'Inversor', SUPERADMIN: 'Superadmin',
};
type Campo = 'nombre' | 'email' | 'rol' | 'ultimoAcceso';

function estadoCuenta(c: CuentaPlataforma): { texto: string; clase: string } {
  if (!c.activo) return { texto: 'Desactivada', clase: 'bg-slate-200 text-slate-700' };
  if (c.bloqueadoHasta && new Date(c.bloqueadoHasta) > new Date()) return { texto: 'Bloqueada', clase: 'bg-red-100 text-red-800' };
  if (c.debeCambiarPassword) return { texto: 'Clave temporal', clase: 'bg-amber-100 text-amber-800' };
  return { texto: 'Activa', clase: 'bg-emerald-100 text-emerald-800' };
}

// Muestra una clave temporal una sola vez, con copia al portapapeles.
function ClaveTemporal({ clave }: { clave: string }) {
  const [copiada, setCopiada] = useState(false);
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="mb-2 text-amber-900">Clave temporal. Se muestra una sola vez: entréguela al usuario. Deberá cambiarla al entrar.</p>
      <div className="flex items-center gap-3">
        <code className="rounded bg-white px-3 py-1.5 font-mono text-base">{clave}</code>
        <button onClick={() => { void navigator.clipboard?.writeText(clave); setCopiada(true); }}
          className="rounded border border-amber-400 px-3 py-1 text-xs">{copiada ? 'Copiada' : 'Copiar'}</button>
      </div>
    </div>
  );
}

type FilaCuenta = CuentaPlataforma & { empresaNombre: string; estadoTexto: string; ultimoTexto: string };

export default function Usuarios() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ q: '', rol: '', estado: 'activo', tenantId: '', dosFactores: '', claveTemporal: '' });
  const q = useQuery({ queryKey: ['cuentas', filtros], queryFn: () => api.plataforma.usuarios(filtros) });
  const empresas = useQuery({ queryKey: ['empresas-plataforma'], queryFn: api.plataforma.empresas });
  const { sort, toggle } = useSortable<'nombre' | 'email' | 'rol' | 'empresaNombre' | 'estadoTexto' | 'ultimoAcceso'>('nombre', 'asc');
  const [pagina, setPagina] = useState(1);
  const [nuevo, setNuevo] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const filas: FilaCuenta[] = (q.data?.usuarios ?? []).map((c) => ({
    ...c,
    empresaNombre: c.tenant.nombre,
    estadoTexto: estadoCuenta(c).texto,
    ultimoTexto: c.ultimoAcceso ?? '',
  }));
  const ordenadas = sortBy(filas, sort.field as keyof FilaCuenta, sort.dir);
  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const visibles = ordenadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const cambiar = (campo: keyof typeof filtros, valor: string) => { setFiltros({ ...filtros, [campo]: valor }); setPagina(1); };

  const columnas: Column<FilaCuenta>[] = [
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'email', header: 'Email', sortable: true, className: 'text-slate-600' },
    { key: 'rol', header: 'Rol', sortable: true, render: (c) => ETIQUETA_ROL[c.rol] ?? c.rol },
    { key: 'empresaNombre', header: 'Empresa', sortable: true },
    {
      key: 'estadoTexto', header: 'Estado', sortable: true,
      render: (c) => { const e = estadoCuenta(c); return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${e.clase}`}>{e.texto}</span>; },
    },
    { key: 'ultimoAcceso', header: 'Último acceso', sortable: true, render: (c) => (c.ultimoAcceso ? fechaHora(c.ultimoAcceso) : '—') },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64"><Input label="Buscar" placeholder="Nombre o email" value={filtros.q} onChange={(e) => cambiar('q', e.target.value)} /></div>
        <label className="text-xs text-slate-500">Rol
          <select value={filtros.rol} onChange={(e) => cambiar('rol', e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="">Todos</option>
            {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Empresa
          <select value={filtros.tenantId} onChange={(e) => cambiar('tenantId', e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="">Todas</option>
            {(empresas.data?.empresas ?? []).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">Estado
          <select value={filtros.estado} onChange={(e) => cambiar('estado', e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="activo">Activas</option>
            <option value="bloqueado">Bloqueadas</option>
            <option value="inactivo">Desactivadas</option>
            <option value="todos">Todas</option>
          </select>
        </label>
        <label className="text-xs text-slate-500">Segundo factor
          <select value={filtros.dosFactores} onChange={(e) => cambiar('dosFactores', e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="">Cualquiera</option><option value="si">Activo</option><option value="no">No activo</option>
          </select>
        </label>
        <label className="text-xs text-slate-500">Clave temporal
          <select value={filtros.claveTemporal} onChange={(e) => cambiar('claveTemporal', e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="">Cualquiera</option><option value="si">Pendiente</option><option value="no">No</option>
          </select>
        </label>
        <button onClick={() => setNuevo(true)} className="ml-auto rounded-full bg-[#07152b] px-4 py-2 text-sm font-semibold text-white">Nuevo usuario</button>
      </div>
      {q.isError && <p className="text-sm text-red-700">No se pudieron cargar las cuentas.</p>}
      <Table
        columns={columnas}
        data={visibles}
        keyExtractor={(c) => c.id}
        sortKey={sort.field}
        sortDir={sort.dir}
        onSort={(k) => { toggle(k as typeof sort.field); setPagina(1); }}
        onRowClick={(c) => setSeleccion(c.id)}
        emptyMessage="No hay cuentas con esos filtros"
      />
      <Pagination page={pagina} totalPages={totalPaginas} onPage={setPagina} total={ordenadas.length} />

      {nuevo && (
        <NuevoUsuario empresas={empresas.data?.empresas ?? []} onCerrar={() => setNuevo(false)}
          onCreado={() => void qc.invalidateQueries({ queryKey: ['cuentas'] })} />
      )}
      {seleccion && (
        <DetalleUsuario id={seleccion} onCerrar={() => setSeleccion(null)} onCambio={() => void qc.invalidateQueries({ queryKey: ['cuentas'] })} />
      )}
    </section>
  );
}

function NuevoUsuario({ empresas, onCerrar, onCreado }: { empresas: { id: string; nombre: string }[]; onCerrar: () => void; onCreado: () => void }) {
  const [datos, setDatos] = useState({ email: '', nombre: '', rol: 'INVERSOR', tenantId: '' });
  const [clave, setClave] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await api.plataforma.crearUsuario(datos);
      setClave(r.claveTemporal);
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Nuevo usuario" onCerrar={onCerrar}>
      {clave ? (
        <div className="space-y-4">
          <ClaveTemporal clave={clave} />
          <button onClick={onCerrar} className="rounded-full bg-[#07152b] px-5 py-2 text-sm text-white">Hecho</button>
        </div>
      ) : (
        <form onSubmit={crear} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Nombre
            <input required minLength={2} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">Email
            <input type="email" required value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">Rol
            <select value={datos.rol} onChange={(e) => setDatos({ ...datos, rol: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
            </select>
          </label>
          <label className="text-sm">Empresa
            <select required value={datos.tenantId} onChange={(e) => setDatos({ ...datos, tenantId: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Seleccione…</option>
              {empresas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p>}
          <div className="md:col-span-2">
            <button disabled={enviando || !datos.tenantId} className="rounded-full bg-[#07152b] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {enviando ? 'Creando…' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DetalleUsuario({ id, onCerrar, onCambio }: { id: string; onCerrar: () => void; onCambio: () => void }) {
  const detalle = useQuery({ queryKey: ['cuenta', id], queryFn: () => api.plataforma.detalle(id) });
  const [clave, setClave] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const u = detalle.data?.usuario;

  async function accion(nombre: string, fn: () => Promise<unknown>) {
    setError(null); setMensaje(null);
    try {
      await fn();
      setMensaje(nombre);
      onCambio();
      void detalle.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción');
    }
  }

  return (
    <Modal titulo={u ? `${u.nombre} · ${ETIQUETA_ROL[u.rol] ?? u.rol}` : 'Cuenta'} onCerrar={onCerrar}>
      {!u && <p className="text-sm text-slate-500">Cargando…</p>}
      {u && (
        <div className="space-y-5 text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <dt className="text-slate-500">Email</dt><dd>{u.email}</dd>
            <dt className="text-slate-500">Empresa</dt><dd>{u.tenant.nombre}</dd>
            <dt className="text-slate-500">Estado</dt><dd>{u.activo ? 'Activa' : 'Desactivada'}{u.debeCambiarPassword ? ' · clave temporal pendiente' : ''}</dd>
            <dt className="text-slate-500">2FA</dt><dd>{u.twoFactorActivo ? 'Activo' : 'No activo'}</dd>
            <dt className="text-slate-500">Intentos fallidos</dt><dd>{u.intentosFallidos}</dd>
            <dt className="text-slate-500">Bloqueada hasta</dt><dd>{u.bloqueadoHasta ? fechaHora(u.bloqueadoHasta) : '—'}</dd>
            <dt className="text-slate-500">Contraseña cambiada</dt><dd>{u.passwordCambiadaEn ? fechaHora(u.passwordCambiadaEn) : 'Nunca'}</dd>
            <dt className="text-slate-500">Alta</dt><dd>{fecha(u.creadoEn)}</dd>
          </dl>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => accion('Clave temporal generada', async () => setClave((await api.plataforma.restablecerClave(id)).claveTemporal))}
              className="rounded border border-slate-300 px-3 py-1.5">Restablecer contraseña</button>
            <button onClick={() => accion('Cuenta desbloqueada', () => api.plataforma.desbloquear(id))} className="rounded border border-slate-300 px-3 py-1.5">Desbloquear</button>
            <button onClick={() => accion('Sesiones cerradas', () => api.plataforma.cerrarSesiones(id))} className="rounded border border-slate-300 px-3 py-1.5">Cerrar sesiones</button>
            <button onClick={() => accion(u.activo ? 'Cuenta desactivada' : 'Cuenta activada', () => api.plataforma.editarUsuario(id, { activo: !u.activo }))}
              className="rounded border border-slate-300 px-3 py-1.5">{u.activo ? 'Desactivar' : 'Activar'}</button>
          </div>
          {clave && <ClaveTemporal clave={clave} />}
          {mensaje && <p className="text-emerald-700">{mensaje}.</p>}
          {error && <p role="alert" className="text-red-700">{error}</p>}

          <EditarCuenta id={id} nombre={u.nombre} rol={u.rol} onGuardado={() => { onCambio(); void detalle.refetch(); }} />

          {u.rol === 'INVERSOR' && <FichaInversorView id={id} />}
        </div>
      )}
    </Modal>
  );
}

function EditarCuenta({ id, nombre, rol, onGuardado }: { id: string; nombre: string; rol: string; onGuardado: () => void }) {
  const [datos, setDatos] = useState({ nombre, rol });
  const [error, setError] = useState<string | null>(null);
  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try { await api.plataforma.editarUsuario(id, datos); onGuardado(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar'); }
  }
  return (
    <form onSubmit={guardar} className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4">
      <label className="text-xs">Nombre<input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm" /></label>
      <label className="text-xs">Rol
        <select value={datos.rol} onChange={(e) => setDatos({ ...datos, rol: e.target.value })} className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
        </select>
      </label>
      <button className="rounded-full bg-[#07152b] px-4 py-1.5 text-sm text-white">Guardar datos</button>
      {error && <p role="alert" className="w-full text-red-700">{error}</p>}
    </form>
  );
}

function FichaInversorView({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['ficha', id], queryFn: () => api.plataforma.ficha(id) });
  const [alta, setAlta] = useState({ tipo: 'APORTACION', importe: '', fecha: new Date().toISOString().slice(0, 10), producto: 'BOT_TRADING', motivo: '' });
  const [editando, setEditando] = useState<string | null>(null);
  const [correccion, setCorreccion] = useState({ importe: '', fecha: '', motivo: '' });
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const ficha = q.data as FichaInversor | undefined;

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      await api.plataforma.crearMovimiento(id, { ...alta, importe: Number(alta.importe) });
      setAlta({ ...alta, importe: '', motivo: '' });
      setAviso('Cambio manual registrado en la auditoría. Los paneles ya muestran el dato actualizado.');
      void q.refetch();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento'); }
  }

  async function corregir(movId: string) {
    setError(null);
    try {
      const datos: { importe?: number; fecha?: string; motivo: string } = { motivo: correccion.motivo };
      if (correccion.importe) datos.importe = Number(correccion.importe);
      if (correccion.fecha) datos.fecha = correccion.fecha;
      await api.plataforma.corregirMovimiento(id, movId, datos);
      setEditando(null);
      setAviso('Corrección registrada en la auditoría con su motivo. Los paneles ya muestran el dato actualizado.');
      void q.refetch();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo corregir el movimiento'); }
  }

  if (!ficha) return <p className="text-slate-500">Cargando ficha…</p>;
  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      <h3 className="font-serif text-lg">Ficha de inversor</h3>
      <div>
        <p className="mb-2 font-semibold">Posiciones</p>
        {ficha.posiciones.length === 0 ? <p className="text-slate-500">Sin posiciones.</p> : (
          <ul className="space-y-1">
            {ficha.posiciones.map((p) => (
              <li key={p.id}>{NOMBRE_PRODUCTO[p.producto]} · desde {fecha(p.fechaAlta)} · aportado {eur(p.capitalAportado)} · {p.estado}</li>
            ))}
          </ul>
        )}
      </div>

      {aviso && <p role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
      <form onSubmit={registrar} className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-6">
        <p className="text-xs font-semibold md:col-span-6">Registrar movimiento manual (corrección o ajuste; queda auditado)</p>
        <select value={alta.tipo} onChange={(e) => setAlta({ ...alta, tipo: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
          <option value="APORTACION">Aportación</option><option value="RETIRADA">Retirada</option>
        </select>
        <select value={alta.producto} onChange={(e) => setAlta({ ...alta, producto: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
          <option value="BOT_TRADING">Bot de trading</option><option value="PROYECTO_CRYPTO">Proyecto crypto</option><option value="TOKEN_SHARE">Share (token)</option>
        </select>
        <input type="number" min="0.01" step="0.01" placeholder="Importe" required value={alta.importe} onChange={(e) => setAlta({ ...alta, importe: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
        <input type="date" required value={alta.fecha} onChange={(e) => setAlta({ ...alta, fecha: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
        <input placeholder="Motivo (mín. 5 caracteres)" required minLength={5} value={alta.motivo} onChange={(e) => setAlta({ ...alta, motivo: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
        <button className="rounded-full bg-[#07152b] px-3 py-1.5 text-sm text-white">Registrar</button>
      </form>

      <div>
        <p className="mb-2 font-semibold">Movimientos</p>
        <Table
          columns={[
            { key: 'fecha', header: 'Fecha', render: (m) => fecha(m.fecha) },
            { key: 'producto', header: 'Producto', render: (m) => NOMBRE_PRODUCTO[m.producto] },
            { key: 'tipo', header: 'Tipo' },
            { key: 'importe', header: 'Importe', className: 'text-right', render: (m) => eur(m.importe) },
            { key: 'acciones', header: '', className: 'text-right', render: (m) => (
              <div>
                <button onClick={() => { setEditando(m.id); setCorreccion({ importe: '', fecha: '', motivo: '' }); }} className="text-xs underline">Corregir</button>
                {editando === m.id && (
                  <div className="mt-2 grid gap-2 rounded bg-slate-50 p-2 text-left">
                    <input type="number" step="0.01" placeholder="Nuevo importe (opcional)" value={correccion.importe} onChange={(e) => setCorreccion({ ...correccion, importe: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input type="date" value={correccion.fecha} onChange={(e) => setCorreccion({ ...correccion, fecha: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input placeholder="Motivo de la corrección" value={correccion.motivo} onChange={(e) => setCorreccion({ ...correccion, motivo: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                    <button onClick={() => corregir(m.id)} className="rounded bg-[#07152b] px-2 py-1 text-xs text-white">Guardar corrección</button>
                  </div>
                )}
              </div>
            ) },
          ]}
          data={ficha.movimientos}
          keyExtractor={(m) => m.id}
          emptyMessage="Sin movimientos"
        />
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
  );
}
