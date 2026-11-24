// Gestión de cuentas desde la plataforma (SUPERADMIN): altas, edición, claves temporales, bloqueos,
// sesiones, ficha de inversor, movimientos y correcciones. Todo queda en la auditoría.
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import type { Prisma, Rol, ProductoInversion, TipoMovimiento } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/criptografia';
import { ErrorApp } from '../lib/errores';
import { generarClaveTemporal } from '../lib/claves';
import { registrarAuditoria, diferencias } from '../lib/auditoria';
import { conContextoPlataforma } from '../lib/contexto-rls';
import { esDuplicado } from './plataforma.service';
import { invalidarAcumulado } from './inversiones.service';

const ROLES: Rol[] = ['SUPERADMIN', 'INVERSOR'];
const PRODUCTOS: ProductoInversion[] = ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'];
const TIPOS_MANUALES: TipoMovimiento[] = ['APORTACION', 'RETIRADA'];

export interface FiltrosUsuarios {
  tenantId?: string;
  rol?: string;
  estado?: 'activo' | 'inactivo' | 'bloqueado' | 'todos';
  q?: string;
  dosFactores?: boolean;
  claveTemporal?: boolean;
}

function rolValido(valor: unknown): Rol {
  if (typeof valor !== 'string' || !ROLES.includes(valor as Rol)) throw new ErrorApp(400, 'Rol no válido');
  return valor as Rol;
}

function importeValido(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) throw new ErrorApp(400, 'Importe no válido');
  return Math.round(n * 100) / 100;
}

function fechaValida(valor: unknown): Date {
  const f = typeof valor === 'string' || typeof valor === 'number' ? new Date(valor) : null;
  if (!f || Number.isNaN(f.getTime())) throw new ErrorApp(400, 'Fecha no válida');
  return f;
}

async function usuarioOFallar(id: string) {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) throw new ErrorApp(404, 'Usuario no encontrado');
  return u;
}

export async function listarUsuarios(f: FiltrosUsuarios) {
  const ahora = new Date();
  const where: Prisma.UsuarioWhereInput = {};
  if (f.tenantId) where.tenantId = f.tenantId;
  if (f.rol && ROLES.includes(f.rol as Rol)) where.rol = f.rol as Rol;
  if (f.estado === 'activo') where.activo = true;
  if (f.estado === 'inactivo') where.activo = false;
  if (f.estado === 'bloqueado') where.bloqueadoHasta = { gt: ahora };
  if (f.dosFactores !== undefined) where.twoFactorActivo = f.dosFactores;
  if (f.claveTemporal !== undefined) where.debeCambiarPassword = f.claveTemporal;
  if (f.q) {
    where.OR = [{ email: { contains: f.q, mode: 'insensitive' } }, { nombre: { contains: f.q, mode: 'insensitive' } }];
  }
  const usuarios = await prisma.usuario.findMany({
    where,
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    take: 500,
    select: {
      id: true, email: true, nombre: true, rol: true, activo: true, twoFactorActivo: true,
      intentosFallidos: true, bloqueadoHasta: true, debeCambiarPassword: true, passwordCambiadaEn: true,
      creadoEn: true, tenantId: true,
      tenant: { select: { nombre: true, esPlataforma: true } },
      sesiones: { where: { revocadaEn: null }, select: { creadaEn: true }, orderBy: { creadaEn: 'desc' }, take: 1 },
    },
  });
  return usuarios.map(({ sesiones, ...u }) => ({
    ...u,
    ultimoAcceso: sesiones[0]?.creadaEn ?? null,
  }));
}

export async function detalleUsuario(id: string) {
  const u = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true, email: true, nombre: true, rol: true, activo: true, twoFactorActivo: true,
      intentosFallidos: true, bloqueadoHasta: true, debeCambiarPassword: true, passwordCambiadaEn: true,
      creadoEn: true, tenantId: true, tenant: { select: { nombre: true } },
    },
  });
  if (!u) throw new ErrorApp(404, 'Usuario no encontrado');
  return u;
}

export async function crearUsuario(actorId: string, datos: { email: string; nombre: string; rol: unknown; tenantId: string }) {
  const rol = rolValido(datos.rol);
  const tenant = await prisma.tenant.findUnique({ where: { id: datos.tenantId } });
  if (!tenant) throw new ErrorApp(400, 'La empresa no existe');
  const claveTemporal = generarClaveTemporal();
  try {
    const usuario = await prisma.$transaction(async (tx) => {
      const creado = await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          email: datos.email.toLowerCase(),
          nombre: datos.nombre,
          rol,
          passwordHash: hashPassword(claveTemporal),
          debeCambiarPassword: true,
        },
        select: { id: true, email: true, nombre: true, rol: true, tenantId: true },
      });
      await registrarAuditoria(tx, {
        tenantId: tenant.id, actorId, entidad: 'Usuario', entidadId: creado.id, accion: 'CREAR',
        cambios: { email: creado.email, nombre: creado.nombre, rol: creado.rol },
      });
      return creado;
    });
    return { usuario, claveTemporal };
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorApp(409, 'El email ya está registrado');
    throw error;
  }
}

export async function editarUsuario(actorId: string, id: string, cambios: { nombre?: unknown; rol?: unknown; activo?: unknown }) {
  if (id === actorId && cambios.activo === false) throw new ErrorApp(400, 'No puedes desactivar tu propia cuenta');
  const antes = await usuarioOFallar(id);
  const datos: Prisma.UsuarioUncheckedUpdateInput = {};
  if (cambios.nombre !== undefined) {
    if (typeof cambios.nombre !== 'string' || cambios.nombre.trim().length < 2 || cambios.nombre.length > 120) throw new ErrorApp(400, 'Nombre no válido');
    datos.nombre = cambios.nombre.trim();
  }
  if (cambios.rol !== undefined) datos.rol = rolValido(cambios.rol);
  if (cambios.activo !== undefined) {
    if (typeof cambios.activo !== 'boolean') throw new ErrorApp(400, 'Campo no válido: activo');
    datos.activo = cambios.activo;
  }
  return prisma.$transaction(async (tx) => {
    const despues = await tx.usuario.update({ where: { id }, data: datos });
    if (cambios.activo === false) {
      await tx.sesionRefresco.updateMany({ where: { usuarioId: id, revocadaEn: null }, data: { revocadaEn: new Date() } });
    }
    const pick = (u: typeof antes) => ({ nombre: u.nombre, rol: u.rol, activo: u.activo });
    const dif = diferencias(pick(antes) as Record<string, unknown>, pick(despues) as Record<string, unknown>);
    if (Object.keys(dif).length > 0) {
      await registrarAuditoria(tx, { tenantId: antes.tenantId, actorId, entidad: 'Usuario', entidadId: id, accion: 'EDITAR', cambios: dif });
    }
    return { id: despues.id, nombre: despues.nombre, rol: despues.rol, activo: despues.activo };
  });
}

// Clave temporal nueva: se muestra una sola vez. Cierra sesiones y obliga a cambiarla al entrar.
export async function restablecerClave(actorId: string, id: string) {
  const u = await usuarioOFallar(id);
  const claveTemporal = generarClaveTemporal();
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id },
      data: { passwordHash: hashPassword(claveTemporal), debeCambiarPassword: true, passwordCambiadaEn: new Date(), intentosFallidos: 0, bloqueadoHasta: null },
    });
    await tx.sesionRefresco.updateMany({ where: { usuarioId: id, revocadaEn: null }, data: { revocadaEn: new Date() } });
    await registrarAuditoria(tx, { tenantId: u.tenantId, actorId, entidad: 'Usuario', entidadId: id, accion: 'EVENTO', cambios: { evento: 'restablecer contraseña temporal' } });
  });
  return { claveTemporal };
}

export async function desbloquear(actorId: string, id: string) {
  const u = await usuarioOFallar(id);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
    await registrarAuditoria(tx, { tenantId: u.tenantId, actorId, entidad: 'Usuario', entidadId: id, accion: 'EVENTO', cambios: { evento: 'desbloqueo' } });
  });
}

export async function cerrarSesiones(actorId: string, id: string) {
  const u = await usuarioOFallar(id);
  const r = await prisma.$transaction(async (tx) => {
    const cierre = await tx.sesionRefresco.updateMany({ where: { usuarioId: id, revocadaEn: null }, data: { revocadaEn: new Date() } });
    await registrarAuditoria(tx, { tenantId: u.tenantId, actorId, entidad: 'Usuario', entidadId: id, accion: 'EVENTO', cambios: { evento: 'cierre de sesiones', sesiones: cierre.count } });
    return cierre;
  });
  return { cerradas: r.count };
}

async function inversorOFallar(id: string) {
  const u = await usuarioOFallar(id);
  if (u.rol !== 'INVERSOR') throw new ErrorApp(400, 'La ficha de inversor solo aplica a cuentas INVERSOR');
  return u;
}

// Ficha de inversor: posiciones y movimientos. Se lee con el contexto de la empresa, auditado por el actor.
export async function fichaInversor(actorId: string, id: string) {
  const u = await inversorOFallar(id);
  return conContextoPlataforma(actorId, u.tenantId, async (tx) => {
    const posiciones = await tx.posicionInversion.findMany({
      where: { inversorId: id },
      orderBy: { fechaAlta: 'asc' },
      select: { id: true, producto: true, estado: true, fechaAlta: true, capitalAportado: true },
    });
    const movimientos = await tx.movimientoInversion.findMany({
      where: { inversorId: id },
      orderBy: [{ fecha: 'desc' }, { id: 'asc' }],
      take: 300,
      select: { id: true, tipo: true, importe: true, fecha: true, posicion: { select: { producto: true } } },
    });
    return {
      inversor: { id: u.id, nombre: u.nombre, email: u.email },
      posiciones: posiciones.map((p) => ({ ...p, capitalAportado: Number(p.capitalAportado) })),
      movimientos: movimientos.map((m) => ({ id: m.id, tipo: m.tipo, importe: Number(m.importe), fecha: m.fecha, producto: m.posicion.producto })),
    };
  });
}

// Alta manual de aportación o retirada, con motivo. Requiere que el inversor ya tenga posición en ese producto.
export async function crearMovimiento(actorId: string, id: string, datos: { tipo: unknown; importe: unknown; fecha: unknown; producto: unknown; motivo: unknown }) {
  const u = await inversorOFallar(id);
  if (typeof datos.tipo !== 'string' || !TIPOS_MANUALES.includes(datos.tipo as TipoMovimiento)) throw new ErrorApp(400, 'Tipo de movimiento no válido');
  if (typeof datos.producto !== 'string' || !PRODUCTOS.includes(datos.producto as ProductoInversion)) throw new ErrorApp(400, 'Producto no válido');
  const importe = importeValido(datos.importe);
  const fecha = fechaValida(datos.fecha);
  if (typeof datos.motivo !== 'string' || datos.motivo.trim().length < 5) throw new ErrorApp(400, 'Indique un motivo (mínimo 5 caracteres)');
  const motivo = datos.motivo.trim().slice(0, 300);
  return conContextoPlataforma(actorId, u.tenantId, async (tx) => {
    const posicion = await tx.posicionInversion.findFirst({ where: { inversorId: id, producto: datos.producto as ProductoInversion } });
    if (!posicion) throw new ErrorApp(409, 'El inversor no tiene posición en ese producto');
    const creado = await tx.movimientoInversion.create({
      data: {
        tenantId: u.tenantId, posicionId: posicion.id, inversorId: id,
        tipo: datos.tipo as TipoMovimiento, importe, fecha, idOrigen: `manual-${randomUUID()}`,
      },
      select: { id: true, tipo: true, importe: true, fecha: true },
    });
    await registrarAuditoria(tx, {
      tenantId: u.tenantId, actorId, entidad: 'MovimientoInversion', entidadId: creado.id, accion: 'CREAR',
      cambios: { tipo: creado.tipo, importe, fecha: fecha.toISOString(), producto: datos.producto, motivo },
    });
    invalidarAcumulado(u.tenantId);
    return { ...creado, importe: Number(creado.importe) };
  });
}

// Corrección de un movimiento existente (importe, fecha o motivo). Queda registrada con el valor anterior.
export async function corregirMovimiento(actorId: string, id: string, movId: string, datos: { importe?: unknown; fecha?: unknown; motivo: unknown }) {
  const u = await inversorOFallar(id);
  if (typeof datos.motivo !== 'string' || datos.motivo.trim().length < 5) throw new ErrorApp(400, 'Indique un motivo de la corrección (mínimo 5 caracteres)');
  const motivo = datos.motivo.trim().slice(0, 300);
  return conContextoPlataforma(actorId, u.tenantId, async (tx) => {
    const antes = await tx.movimientoInversion.findFirst({ where: { id: movId, inversorId: id } });
    if (!antes) throw new ErrorApp(404, 'Movimiento no encontrado');
    const datosNuevos: Prisma.MovimientoInversionUncheckedUpdateInput = {};
    if (datos.importe !== undefined) datosNuevos.importe = importeValido(datos.importe);
    if (datos.fecha !== undefined) datosNuevos.fecha = fechaValida(datos.fecha);
    const despues = await tx.movimientoInversion.update({ where: { id: movId }, data: datosNuevos });
    const pick = (m: typeof antes) => ({ importe: Number(m.importe), fecha: m.fecha.toISOString() });
    const dif = diferencias(pick(antes) as Record<string, unknown>, pick(despues) as Record<string, unknown>);
    await registrarAuditoria(tx, {
      tenantId: u.tenantId, actorId, entidad: 'MovimientoInversion', entidadId: movId, accion: 'EDITAR',
      cambios: { ...dif, motivo },
    });
    invalidarAcumulado(u.tenantId);
    return { id: despues.id, importe: Number(despues.importe), fecha: despues.fecha };
  });
}

// Auditoría de toda la plataforma, con filtros. Más reciente primero.
export async function listarAuditoria(f: { entidad?: string; accion?: string; actorId?: string; desde?: Date; hasta?: Date; tenantId?: string }) {
  const where: Prisma.RegistroAuditoriaWhereInput = {};
  if (f.entidad) where.entidad = f.entidad;
  if (f.accion) where.accion = f.accion;
  if (f.actorId) where.actorId = f.actorId;
  if (f.tenantId) where.tenantId = f.tenantId;
  if (f.desde || f.hasta) where.creadoEn = { gte: f.desde, lte: f.hasta };
  const filas = await prisma.registroAuditoria.findMany({ where, orderBy: { creadoEn: 'desc' }, take: 300 });
  const ids = [...new Set(filas.map((r) => r.actorId))];
  const actores = await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, nombre: true } });
  const porId = new Map(actores.map((a) => [a.id, a]));
  return filas.map((r) => ({ ...r, actor: porId.get(r.actorId) ?? null }));
}

// Exportación de la auditoría a Excel con los mismos filtros. La propia exportación queda registrada.
export async function exportarAuditoriaXlsx(actorId: string, tenantIdActor: string, f: Parameters<typeof listarAuditoria>[0]): Promise<Buffer> {
  const filas = await listarAuditoria(f);
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Cryptofront';
  const hoja = libro.addWorksheet('Auditoría');
  hoja.columns = [
    { header: 'Fecha y hora (Madrid)', key: 'fecha', width: 22 },
    { header: 'Quién', key: 'quien', width: 40 },
    { header: 'Entidad', key: 'entidad', width: 22 },
    { header: 'Entidad ID', key: 'entidadId', width: 28 },
    { header: 'Acción', key: 'accion', width: 12 },
    { header: 'Cambios', key: 'cambios', width: 80 },
  ];
  hoja.getRow(1).font = { bold: true };
  for (const r of filas) {
    hoja.addRow({
      fecha: new Date(r.creadoEn).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
      quien: r.actor ? `${r.actor.nombre} <${r.actor.email}>` : 'Sistema',
      entidad: r.entidad,
      entidadId: r.entidadId ?? '',
      accion: r.accion,
      cambios: r.cambios ? JSON.stringify(r.cambios) : '',
    });
  }
  await prisma.$transaction((tx) => registrarAuditoria(tx, {
    tenantId: tenantIdActor, actorId, entidad: 'Auditoria', entidadId: null, accion: 'EVENTO',
    cambios: { evento: 'exportación de auditoría', filas: filas.length },
  }));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

// Resumen de inversores de una empresa: número por categoría (producto) y evolución mensual
// de altas, bajas y total. Un inversor es de alta desde su primera posición y de baja cuando
// todas sus posiciones están finalizadas.
export async function resumenInversores(actorId: string, tenantId: string) {
  const inversores = await prisma.usuario.findMany({ where: { tenantId, rol: 'INVERSOR' }, select: { id: true, activo: true } });
  const posiciones = await conContextoPlataforma(actorId, tenantId, (tx) => tx.posicionInversion.findMany({
    select: { inversorId: true, producto: true, estado: true, fechaAlta: true, fechaBaja: true },
  }));
  const categorias = ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'] as const;
  const porCategoria = categorias.map((producto) => {
    const ids = new Set(posiciones.filter((p) => p.producto === producto && p.estado === 'ACTIVA').map((p) => p.inversorId));
    return { producto, inversoresActivos: ids.size };
  });
  const porInversor = new Map<string, { alta: Date; baja: Date | null; activa: boolean }>();
  for (const p of posiciones) {
    const cur = porInversor.get(p.inversorId);
    const alta = cur ? (p.fechaAlta < cur.alta ? p.fechaAlta : cur.alta) : p.fechaAlta;
    const activa = (cur?.activa ?? false) || p.estado === 'ACTIVA';
    const baja = p.estado === 'FINALIZADA' && p.fechaBaja ? (!cur?.baja || p.fechaBaja > cur.baja ? p.fechaBaja : cur.baja) : cur?.baja ?? null;
    porInversor.set(p.inversorId, { alta, baja: activa ? null : baja, activa });
  }
  const mes = (d: Date) => d.toISOString().slice(0, 7);
  const altas = new Map<string, number>();
  const bajas = new Map<string, number>();
  for (const v of porInversor.values()) {
    altas.set(mes(v.alta), (altas.get(mes(v.alta)) ?? 0) + 1);
    if (!v.activa && v.baja) bajas.set(mes(v.baja), (bajas.get(mes(v.baja)) ?? 0) + 1);
  }
  const claves = [...new Set([...altas.keys(), ...bajas.keys()])].sort();
  let total = 0;
  const evolucion = claves.length === 0 ? [] : (() => {
    const [a0, m0] = claves[0].split('-').map(Number);
    const hoy = new Date();
    const [a1, m1] = [hoy.getUTCFullYear(), hoy.getUTCMonth() + 1];
    const salida: { mes: string; altas: number; bajas: number; total: number }[] = [];
    for (let a = a0, m = m0; a < a1 || (a === a1 && m <= m1); m++) {
      if (m > 12) { m = 1; a++; }
      const k = `${a}-${String(m).padStart(2, '0')}`;
      total += (altas.get(k) ?? 0) - (bajas.get(k) ?? 0);
      salida.push({ mes: k, altas: altas.get(k) ?? 0, bajas: bajas.get(k) ?? 0, total });
    }
    return salida;
  })();
  return {
    totalInversores: inversores.length,
    activos: inversores.filter((i) => i.activo).length,
    porCategoria,
    evolucion,
  };
}
