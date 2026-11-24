// Cálculos de la zona de inversores y del panel de gestión. Todo se lee dentro de conContextoRls,
// así que Postgres limita las filas al inversor (o a la empresa para gestión) aunque este código falle.
//
// Reglas (supuestos provisionales, ver docs/estado-sesion.md):
// - Bot de trading: el valor de la posición es el último valor diario cargado.
// - Proyecto cripto y token share: valor = capital aportado + rendimientos + reparto − retiradas.
// - Patrimonio = suma de valores actuales. Capital aportado = suma de aportaciones.
// - Ganancia = patrimonio + retiradas − capital aportado. ROI = ganancia / capital aportado.
// - Comisiones: ya están reflejadas en el valor diario del bot; se listan como movimientos informativos.
import { conContextoRls, UsuarioContexto } from '../lib/contexto-rls';
import { prisma } from '../lib/prisma';

export type ProductoPublico = 'BOT_TRADING' | 'PROYECTO_CRYPTO' | 'TOKEN_SHARE';
type Producto = ProductoPublico;
const PRODUCTOS: Producto[] = ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'];

const num = (v: unknown) => Number(v ?? 0);
const redondear = (n: number) => Math.round(n * 100) / 100;
const inicioMes = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

interface Datos {
  posiciones: { id: string; inversorId: string; producto: Producto; fechaAlta: Date; capitalAportado: unknown; estado: string }[];
  movimientos: { posicionId: string; tipo: string; importe: unknown; fecha: Date }[];
  valores: { posicionId: string; fecha: Date; valor: unknown }[];
}

// Agrupa movimientos y valores por posición una sola vez, ordenados por fecha.
function indexarPorPosicion<T extends { posicionId: string; fecha: Date }>(filas: T[]) {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    const lista = mapa.get(f.posicionId);
    if (lista) lista.push(f); else mapa.set(f.posicionId, [f]);
  }
  for (const lista of mapa.values()) lista.sort((x, y) => +x.fecha - +y.fecha);
  return mapa;
}

function agregarPorPosicion(d: Datos) {
  const movPor = indexarPorPosicion(d.movimientos);
  const valPor = indexarPorPosicion(d.valores);
  return d.posiciones.map((p) => {
    const movs = movPor.get(p.id) ?? [];
    const suma = (tipo: string) => movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + num(m.importe), 0);
    const aportado = suma('APORTACION') || num(p.capitalAportado);
    const retirado = suma('RETIRADA');
    const rendimientos = suma('RENDIMIENTO') + suma('REPARTO');
    const comisiones = suma('COMISION');
    const valoresP = valPor.get(p.id) ?? [];
    const valorActual = p.producto === 'BOT_TRADING' && valoresP.length
      ? num(valoresP[valoresP.length - 1].valor)
      : aportado + rendimientos - retirado;
    return { ...p, aportado, retirado, rendimientos, comisiones, valorActual };
  });
}

// Serie diaria: patrimonio y capital aportado acumulado, desde la primera posición hasta hoy.
// Cada posición avanza con punteros sobre sus movimientos y valores ordenados: coste lineal.
function serie(d: Datos, producto: Producto | null, desde: Date) {
  const hoy = new Date();
  const movPor = indexarPorPosicion(d.movimientos);
  const valPor = indexarPorPosicion(d.valores);
  const estados = agregarPorPosicion(d)
    .filter((p) => !producto || p.producto === producto)
    .map((p) => ({
      p,
      movs: movPor.get(p.id) ?? [],
      vals: valPor.get(p.id) ?? [],
      iMov: 0,
      iVal: 0,
      sumas: { APORTACION: 0, RETIRADA: 0, RENDIMIENTO: 0, REPARTO: 0 } as Record<string, number>,
      valorDia: null as number | null,
    }));
  const puntos: { fecha: string; valor: number; capitalAportado: number }[] = [];
  for (let t = +desde; t <= +hoy; t += 86_400_000) {
    const dia = new Date(t);
    const fin = t + 86_400_000 - 1;
    let valor = 0;
    let capital = 0;
    for (const e of estados) {
      if (+e.p.fechaAlta > fin) continue;
      // Solo lo aportado hasta este día: las aportaciones posteriores no cuentan aún.
      while (e.iMov < e.movs.length && +e.movs[e.iMov].fecha <= fin) {
        const m = e.movs[e.iMov];
        if (m.tipo in e.sumas) e.sumas[m.tipo] += num(m.importe);
        e.iMov++;
      }
      while (e.iVal < e.vals.length && +e.vals[e.iVal].fecha <= fin) {
        e.valorDia = num(e.vals[e.iVal].valor);
        e.iVal++;
      }
      const aportadoHasta = e.sumas.APORTACION || num(e.p.capitalAportado);
      capital += aportadoHasta;
      if (e.p.producto === 'BOT_TRADING') {
        valor += e.valorDia ?? aportadoHasta;
      } else {
        valor += aportadoHasta + e.sumas.RENDIMIENTO + e.sumas.REPARTO - e.sumas.RETIRADA;
      }
    }
    puntos.push({ fecha: dia.toISOString().slice(0, 10), valor: redondear(valor), capitalAportado: redondear(capital) });
  }
  return puntos;
}

// Lectura del acumulado de una empresa (plataforma): se reutiliza unos minutos entre los paneles que
// la piden a la vez. Los datos solo cambian con las cargas semanales, así que el margen es seguro.
const TTL_ACUMULADO_MS = 2 * 60 * 1000;
const cacheAcumulado = new Map<string, { hasta: number; datos: Promise<Datos> }>();

async function cargar(u: UsuarioContexto, inversorId: string | null) {
  const leer = () => conContextoRls(u, async (tx) => {
    const filtro = inversorId ? { inversorId } : {};
    const [posiciones, movimientos, valores] = await Promise.all([
      tx.posicionInversion.findMany({ where: filtro, orderBy: { fechaAlta: 'asc' } }),
      tx.movimientoInversion.findMany({ where: filtro, orderBy: { fecha: 'asc' } }),
      tx.valorDiarioInversion.findMany({ where: filtro, orderBy: { fecha: 'asc' } }),
    ]);
    return { posiciones, movimientos, valores } as Datos;
  });
  if (inversorId !== null) return leer();
  const clave = u.tenantId;
  const ahora = Date.now();
  const entrada = cacheAcumulado.get(clave);
  if (entrada && entrada.hasta > ahora) return entrada.datos;
  const datos = leer();
  cacheAcumulado.set(clave, { hasta: ahora + TTL_ACUMULADO_MS, datos });
  // Si la lectura falla, no se deja en caché.
  datos.catch(() => cacheAcumulado.delete(clave));
  return datos;
}

// inversorId: el propio inversor (por defecto) o, para la plataforma, un inversor concreto. null = acumulado de la empresa.
export async function resumenInversor(u: UsuarioContexto, inversorId: string | null = u.id) {
  const d = await cargar(u, inversorId);
  const pos = agregarPorPosicion(d);
  const patrimonio = pos.reduce((s, p) => s + p.valorActual, 0);
  const aportado = pos.reduce((s, p) => s + p.aportado, 0);
  const retirado = pos.reduce((s, p) => s + p.retirado, 0);
  const ganancia = patrimonio + retirado - aportado;
  // Misma fórmula que la tabla mensual: variación del valor menos aportes netos del mes.
  const mesActual = new Date().toISOString().slice(0, 7);
  const gananciaMes = rentabilidadMeses(d).find((m) => m.mes === mesActual)?.gananciaEur ?? 0;
  const primera = d.posiciones[0];
  return {
    patrimonio: redondear(patrimonio),
    capitalAportado: redondear(aportado),
    ganancia: redondear(ganancia),
    roiPct: aportado ? redondear((ganancia / aportado) * 100) : 0,
    gananciaMes: redondear(gananciaMes),
    estrategiasActivas: pos.filter((p) => p.estado === 'ACTIVA').length,
    clienteDesde: primera ? primera.fechaAlta : null,
    datosActualizadosEn: new Date().toISOString(),
    porProducto: PRODUCTOS.map((producto) => {
      const ps = pos.filter((p) => p.producto === producto);
      const ap = ps.reduce((s, p) => s + p.aportado, 0);
      const va = ps.reduce((s, p) => s + p.valorActual, 0);
      return {
        producto,
        aportado: redondear(ap),
        valor: redondear(va),
        roiPct: ap ? redondear(((va - ap) / ap) * 100) : 0,
        posiciones: ps.length,
      };
    }),
  };
}

export async function serieInversor(u: UsuarioContexto, producto: Producto | null, periodo: '6m' | '1a' | 'todo', inversorId: string | null = u.id) {
  const d = await cargar(u, inversorId);
  const primera = d.posiciones[0]?.fechaAlta ?? new Date();
  const desde = periodo === 'todo'
    ? new Date(primera)
    : new Date(Date.now() - (periodo === '6m' ? 182 : 365) * 86_400_000);
  return serie(d, producto, new Date(Math.max(+desde, +primera)));
}

export async function movimientosInversor(u: UsuarioContexto, limite: number, inversorId: string | null = u.id) {
  return conContextoRls(u, (tx) => tx.movimientoInversion.findMany({
    where: inversorId ? { inversorId } : {},
    orderBy: { fecha: 'desc' },
    take: limite,
    select: { id: true, tipo: true, importe: true, fecha: true, posicion: { select: { producto: true } } },
  })).then((filas) => filas.map((m) => ({
    id: m.id, tipo: m.tipo, importe: num(m.importe), fecha: m.fecha, producto: m.posicion.producto,
  })));
}

// Rentabilidad mensual y acumulada (Dietz simplificado): la base es el valor del mes anterior más los
// aportes netos del mes. El mes en curso se marca como parcial.
function rentabilidadMeses(d: Awaited<ReturnType<typeof cargar>>) {
  const primera = d.posiciones[0]?.fechaAlta;
  if (!primera) return [];
  const puntos = serie(d, null, new Date(Date.UTC(primera.getUTCFullYear(), primera.getUTCMonth(), primera.getUTCDate())));
  const finDeMes = new Map<string, number>();
  for (const p of puntos) finDeMes.set(p.fecha.slice(0, 7), p.valor);
  const netoDelMes = (mes: string) => d.movimientos
    .filter((m) => m.fecha.toISOString().slice(0, 7) === mes)
    .reduce((s, m) => s + (m.tipo === 'APORTACION' ? num(m.importe) : m.tipo === 'RETIRADA' ? -num(m.importe) : 0), 0);
  const actual = new Date().toISOString().slice(0, 7);
  let anterior = 0;
  let acumulado = 1;
  return [...finDeMes.keys()].sort().map((mes) => {
    const valor = finDeMes.get(mes) ?? anterior;
    const neto = netoDelMes(mes);
    const base = anterior + neto;
    const ganancia = valor - anterior - neto;
    const r = base > 0 ? ganancia / base : 0;
    acumulado *= 1 + r;
    anterior = valor;
    return {
      mes,
      parcial: mes === actual,
      rentabilidadPct: redondear(r * 100),
      acumuladaPct: redondear((acumulado - 1) * 100),
      valorFin: redondear(valor),
      gananciaEur: redondear(ganancia),
      factor: acumulado,
    };
  });
}

// Rentabilidad anualizada desde el alta: el factor acumulado de la serie mensual elevado a 365/días.
// No se calcula con periodos cortos (menos de 90 días), porque daría cifras engañosas.
export function rentabilidadAnualizada(meses: { factor: number }[], fechaAlta: Date, hoy = new Date()): number | null {
  const ultimo = meses[meses.length - 1];
  if (!ultimo) return null;
  const dias = (+hoy - +fechaAlta) / 86_400_000;
  if (dias < 90) return null;
  return redondear((Math.pow(ultimo.factor, 365 / dias) - 1) * 100);
}

export async function rentabilidadInversor(u: UsuarioContexto, inversorId: string | null = u.id) {
  const d = await cargar(u, inversorId);
  const carga = await ultimaCarga(u.tenantId);
  const raw = rentabilidadMeses(d);
  const meses = raw.map(({ factor: _f, ...resto }) => resto);
  const primera = d.posiciones[0]?.fechaAlta;
  const rentabilidadAnualizadaPct = primera ? rentabilidadAnualizada(raw, primera) : null;
  return { meses, rentabilidadAnualizadaPct, ...carga };
}

// Última carga correcta de la empresa y la próxima prevista (semanal, estimada).
export async function ultimaCarga(tenantId: string) {
  const c = await prisma.cargaInversion.findFirst({ where: { tenantId, estado: 'OK' }, orderBy: { fechaCarga: 'desc' } });
  if (!c) return { ultimaCarga: null, proximaCarga: null, frecuencia: 'semanal' as const };
  return {
    ultimaCarga: c.fechaCarga,
    proximaCarga: new Date(+c.fechaCarga + 7 * 86_400_000),
    frecuencia: 'semanal' as const,
  };
}
