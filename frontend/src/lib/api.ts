// Cliente HTTP. El token de acceso va en memoria (no en localStorage). El refresco se guarda en sessionStorage.
import { useSesion } from './sesion';

export interface EstadoServicio { status: string; servicio: string }
export interface UsuarioPublico { id: string; email: string; nombre: string; rol: string; twoFactorActivo: boolean; idioma: 'es' | 'en' }

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
  resumenGestion: () => peticion<ResumenGestion>('/api/inversiones/gestion/resumen'),
  rentabilidad: () => peticion<Rentabilidad>('/api/inversiones/rentabilidad'),
  cargasPlataforma: () => peticion<{ cargas: CargaPlataforma[] }>('/api/plataforma/cargas'),
};

export interface ResumenInversor {
  patrimonio: number; capitalAportado: number; ganancia: number; roiPct: number; gananciaMes: number;
  estrategiasActivas: number; clienteDesde: string | null; datosActualizadosEn: string;
  porProducto: { producto: Producto; aportado: number; valor: number; roiPct: number; posiciones: number }[];
}
export interface PuntoSerie { fecha: string; valor: number; capitalAportado: number }
export interface Movimiento { id: string; tipo: string; importe: number; fecha: string; producto: Producto }
export interface ResumenGestion {
  inversores: number; aportado: number; valor: number; retirado: number; comisiones: number; beneficio: number; roiPct: number;
  porProducto: { producto: Producto; inversores: number; posiciones: number; aportado: number; valor: number;
    retirado: number; comisiones: number; beneficio: number; roiPct: number }[];
}
export type Producto = 'BOT_TRADING' | 'PROYECTO_CRYPTO' | 'TOKEN_SHARE';

export interface RentabilidadMes { mes: string; parcial: boolean; rentabilidadPct: number; acumuladaPct: number; valorFin: number }
export interface Rentabilidad { meses: RentabilidadMes[]; rentabilidadAnualizadaPct: number | null; ultimaCarga: string | null; proximaCarga: string | null; frecuencia: 'semanal' }
export interface CargaPlataforma {
  id: string; fechaCarga: string; origen: string; estado: 'OK' | 'ERROR';
  filasRecibidas: number; filasAceptadas: number; erroresResumen: string | null; tenant: { nombre: string };
}
