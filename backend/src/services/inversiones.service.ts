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

function agregarPorPosicion(d: Datos) {
  return d.posiciones.map((p) => {
    const movs = d.movimientos.filter((m) => m.posicionId === p.id);
    const suma = (tipo: string) => movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + num(m.importe), 0);
    const aportado = suma('APORTACION') || num(p.capitalAportado);
    const retirado = suma('RETIRADA');
    const rendimientos = suma('RENDIMIENTO') + suma('REPARTO');
    const comisiones = suma('COMISION');
    const valoresP = d.valores.filter((v) => v.posicionId === p.id).sort((a, b) => +a.fecha - +b.fecha);
    const valorActual = p.producto === 'BOT_TRADING' && valoresP.length
      ? num(valoresP[valoresP.length - 1].valor)
      : aportado + rendimientos - retirado;
    return { ...p, aportado, retirado, rendimientos, comisiones, valorActual };
  });
}

// Serie diaria: patrimonio y capital aportado acumulado, desde la primera posición hasta hoy.
function serie(d: Datos, producto: Producto | null, desde: Date) {
  const hoy = new Date();
  const posiciones = agregarPorPosicion(d).filter((p) => !producto || p.producto === producto);
  const puntos: { fecha: string; valor: number; capitalAportado: number }[] = [];
  for (let t = +desde; t <= +hoy; t += 86_400_000) {
    const dia = new Date(t);
    const fin = t + 86_400_000 - 1;
    let valor = 0;
    let capital = 0;
    for (const p of posiciones) {
      if (+p.fechaAlta > fin) continue;
      capital += p.aportado;
      if (p.producto === 'BOT_TRADING') {
        const vs = d.valores.filter((v) => v.posicionId === p.id && +v.fecha <= fin).sort((a, b) => +b.fecha - +a.fecha);
        valor += vs.length ? num(vs[0].valor) : p.aportado;
      } else {
        const mov = d.movimientos.filter((m) => m.posicionId === p.id && +m.fecha <= fin);
        const acum = (tipo: string) => mov.filter((m) => m.tipo === tipo).reduce((s, m) => s + num(m.importe), 0);
        valor += p.aportado + acum('RENDIMIENTO') + acum('REPARTO') - acum('RETIRADA');
      }
    }
    puntos.push({ fecha: dia.toISOString().slice(0, 10), valor: redondear(valor), capitalAportado: redondear(capital) });
  }
  return puntos;
}

async function cargar(u: UsuarioContexto, inversorId: string | null) {
  return conContextoRls(u, async (tx) => {
    const filtro = inversorId ? { inversorId } : {};
    const [posiciones, movimientos, valores] = await Promise.all([
      tx.posicionInversion.findMany({ where: filtro, orderBy: { fechaAlta: 'asc' } }),
      tx.movimientoInversion.findMany({ where: filtro, orderBy: { fecha: 'asc' } }),
      tx.valorDiarioInversion.findMany({ where: filtro, orderBy: { fecha: 'asc' } }),
    ]);
    return { posiciones, movimientos, valores } as Datos;
  });
}

export async function resumenInversor(u: UsuarioContexto) {
  const d = await cargar(u, u.id);
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

export async function serieInversor(u: UsuarioContexto, producto: Producto | null, periodo: '6m' | '1a' | 'todo') {
  const d = await cargar(u, u.id);
  const primera = d.posiciones[0]?.fechaAlta ?? new Date();
  const desde = periodo === 'todo'
    ? new Date(primera)
    : new Date(Date.now() - (periodo === '6m' ? 182 : 365) * 86_400_000);
  return serie(d, producto, new Date(Math.max(+desde, +primera)));
}

export async function movimientosInversor(u: UsuarioContexto, limite: number) {
  return conContextoRls(u, (tx) => tx.movimientoInversion.findMany({
    where: { inversorId: u.id },
    orderBy: { fecha: 'desc' },
    take: limite,
    select: { id: true, tipo: true, importe: true, fecha: true, posicion: { select: { producto: true } } },
  })).then((filas) => filas.map((m) => ({
    id: m.id, tipo: m.tipo, importe: num(m.importe), fecha: m.fecha, producto: m.posicion.producto,
  })));
}

// Panel de gestión (DIRECTOR_EMPRESA): todas las posiciones de la empresa.
export async function resumenGestion(u: UsuarioContexto) {
  const d = await cargar(u, null);
  const pos = agregarPorPosicion(d);
  const porProducto = PRODUCTOS.map((producto) => {
    const ps = pos.filter((p) => p.producto === producto);
    const ap = ps.reduce((s, p) => s + p.aportado, 0);
    const va = ps.reduce((s, p) => s + p.valorActual, 0);
    const ret = ps.reduce((s, p) => s + p.retirado, 0);
    const com = ps.reduce((s, p) => s + p.comisiones, 0);
    return {
      producto,
      inversores: new Set(ps.map((p) => p.inversorId)).size,
      posiciones: ps.length,
      aportado: redondear(ap),
      valor: redondear(va),
      retirado: redondear(ret),
      comisiones: redondear(com),
      beneficio: redondear(va + ret - ap),
      roiPct: ap ? redondear(((va + ret - ap) / ap) * 100) : 0,
    };
  });
  const total = (k: 'aportado' | 'valor' | 'retirado' | 'comisiones' | 'beneficio') =>
    redondear(porProducto.reduce((s, p) => s + p[k], 0));
  const aportadoTotal = total('aportado');
  return {
    inversores: new Set(pos.map((p) => p.inversorId)).size,
    aportado: aportadoTotal,
    valor: total('valor'),
    retirado: total('retirado'),
    comisiones: total('comisiones'),
    beneficio: total('beneficio'),
    roiPct: aportadoTotal ? redondear((total('beneficio') / aportadoTotal) * 100) : 0,
    porProducto,
  };
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

export async function rentabilidadInversor(u: UsuarioContexto) {
  const d = await cargar(u, u.id);
  const carga = await ultimaCarga(u.tenantId);
  const raw = rentabilidadMeses(d);
  const meses = raw.map(({ gananciaEur: _g, factor: _f, ...resto }) => resto);
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
