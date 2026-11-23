// Cliente HTTP. El token de acceso va en memoria (no en localStorage). El refresco se guarda en sessionStorage.
import { useSesion } from './sesion';

export interface EstadoServicio { status: string; servicio: string }
export interface UsuarioPublico { id: string; email: string; nombre: string; rol: string; twoFactorActivo: boolean; idioma: 'es' | 'en'; debeCambiarPassword: boolean }

export async function obtenerEstado(): Promise<EstadoServicio> {
  const res = await fetch('/health');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<EstadoServicio>;
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}, reintentar = true): Promise<T> {
  const token = useSesion.getState().accessToken;
  const res = await fetch(ruta, {
    ...opciones,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers ?? {}),
    },
  });
  if (res.status === 401 && reintentar && (await renovarSesion())) return peticion<T>(ruta, opciones, false);
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    throw new Error((cuerpo as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function renovarSesion(): Promise<boolean> {
  const refreshToken = useSesion.getState().refreshToken;
  if (!refreshToken) return false;
  try {
    const sesion = await fetch('/api/auth/refrescar', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
    if (!sesion.ok) { useSesion.getState().cerrar(); return false; }
    const datos = await sesion.json();
    useSesion.getState().guardar(datos);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  restaurar: () => renovarSesion(),
  login: (email: string, password: string) =>
    peticion<{ requiere2fa: false; accessToken: string; refreshToken: string; usuario: UsuarioPublico }
      | { requiere2fa: true; preToken: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),
  verificar2fa: (preToken: string, codigo: string) =>
    peticion<{ accessToken: string; refreshToken: string; usuario: UsuarioPublico }>(
      '/api/auth/2fa/verificar', { method: 'POST', body: JSON.stringify({ preToken, codigo }) }, false),
  salir: () => {
    const refreshToken = useSesion.getState().refreshToken;
    if (refreshToken) void fetch('/api/auth/salir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
    useSesion.getState().cerrar();
  },
  resumenInversor: () => peticion<ResumenInversor>('/api/inversiones/resumen'),
  serie: (producto: string | null, periodo: string) =>
    peticion<{ datos: PuntoSerie[] }>(`/api/inversiones/serie?periodo=${periodo}${producto ? `&producto=${producto}` : ''}`),
  movimientos: () => peticion<{ datos: Movimiento[] }>('/api/inversiones/movimientos?limite=20'),
  rentabilidad: () => peticion<Rentabilidad>('/api/inversiones/rentabilidad'),
  cargasPlataforma: () => peticion<{ cargas: CargaPlataforma[] }>('/api/plataforma/cargas'),
  cambiarPassword: async (actual: string, nueva: string) => {
    const datos = await peticion<{ accessToken: string; refreshToken: string; usuario: UsuarioPublico }>(
      '/api/auth/cambiar-password', { method: 'POST', body: JSON.stringify({ actual, nueva }) });
    useSesion.getState().guardar(datos);
    return datos;
  },
  plataforma: {
    usuarios: (filtros: Record<string, string>) => {
      const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
      return peticion<{ usuarios: CuentaPlataforma[] }>(`/api/plataforma/usuarios${qs ? `?${qs}` : ''}`);
    },
    crearUsuario: (datos: { email: string; nombre: string; rol: string; tenantId: string }) =>
      peticion<{ usuario: { id: string; email: string }; claveTemporal: string }>('/api/plataforma/usuarios', { method: 'POST', body: JSON.stringify(datos) }),
    editarUsuario: (id: string, cambios: { nombre?: string; rol?: string; activo?: boolean }) =>
      peticion<{ usuario: unknown }>(`/api/plataforma/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) }),
    restablecerClave: (id: string) =>
      peticion<{ claveTemporal: string }>(`/api/plataforma/usuarios/${id}/restablecer-clave`, { method: 'POST' }),
    desbloquear: (id: string) => peticion<void>(`/api/plataforma/usuarios/${id}/desbloquear`, { method: 'POST' }),
    cerrarSesiones: (id: string) => peticion<{ cerradas: number }>(`/api/plataforma/usuarios/${id}/cerrar-sesiones`, { method: 'POST' }),
    empresas: () => peticion<{ empresas: { id: string; nombre: string }[] }>('/api/plataforma/empresas'),
    detalle: (id: string) => peticion<{ usuario: CuentaPlataforma & { tenant: { nombre: string } } }>(`/api/plataforma/usuarios/${id}`),
    ficha: (id: string) => peticion<FichaInversor>(`/api/plataforma/usuarios/${id}/ficha`),
    crearMovimiento: (id: string, datos: { tipo: string; importe: number; fecha: string; producto: string; motivo: string }) =>
      peticion<{ movimiento: unknown }>(`/api/plataforma/usuarios/${id}/movimientos`, { method: 'POST', body: JSON.stringify(datos) }),
    corregirMovimiento: (id: string, movId: string, datos: { importe?: number; fecha?: string; motivo: string }) =>
      peticion<{ movimiento: unknown }>(`/api/plataforma/usuarios/${id}/movimientos/${movId}`, { method: 'PATCH', body: JSON.stringify(datos) }),
    auditoriaXlsx: async (filtros: Record<string, string>) => {
      const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
      const token = useSesion.getState().accessToken;
      const res = await fetch(`/api/plataforma/auditoria/excel${qs ? `?${qs}` : ''}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`No se pudo exportar (${res.status})`);
      return res.blob();
    },
    auditoria: (filtros: Record<string, string>) => {
      const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
      return peticion<{ registros: RegistroAuditoria[] }>(`/api/plataforma/auditoria${qs ? `?${qs}` : ''}`);
    },
  },
};

export interface CuentaPlataforma {
  id: string; email: string; nombre: string; rol: string; activo: boolean; twoFactorActivo: boolean;
  intentosFallidos: number; bloqueadoHasta: string | null; debeCambiarPassword: boolean;
  passwordCambiadaEn: string | null; creadoEn: string; ultimoAcceso: string | null; tenantId: string;
  tenant: { nombre: string; esPlataforma: boolean };
}
export interface FichaInversor {
  inversor: { id: string; nombre: string; email: string };
  posiciones: { id: string; producto: Producto; estado: string; fechaAlta: string; capitalAportado: number }[];
  movimientos: { id: string; tipo: string; importe: number; fecha: string; producto: Producto }[];
}
export interface RegistroAuditoria {
  id: string; entidad: string; entidadId: string | null; accion: string; cambios: unknown; creadoEn: string;
  tenantId: string | null; actor: { id: string; email: string; nombre: string } | null;
}

export interface ResumenInversor {
  patrimonio: number; capitalAportado: number; ganancia: number; roiPct: number; gananciaMes: number;
  estrategiasActivas: number; clienteDesde: string | null; datosActualizadosEn: string;
  porProducto: { producto: Producto; aportado: number; valor: number; roiPct: number; posiciones: number }[];
}
export interface PuntoSerie { fecha: string; valor: number; capitalAportado: number }
export interface Movimiento { id: string; tipo: string; importe: number; fecha: string; producto: Producto }
export type Producto = 'BOT_TRADING' | 'PROYECTO_CRYPTO' | 'TOKEN_SHARE';

export interface RentabilidadMes { mes: string; parcial: boolean; rentabilidadPct: number; acumuladaPct: number; valorFin: number }
export interface Rentabilidad { meses: RentabilidadMes[]; rentabilidadAnualizadaPct: number | null; ultimaCarga: string | null; proximaCarga: string | null; frecuencia: 'semanal' }
export interface CargaPlataforma {
  id: string; fechaCarga: string; origen: string; estado: 'OK' | 'ERROR';
  filasRecibidas: number; filasAceptadas: number; erroresResumen: string | null; tenant: { nombre: string };
}
