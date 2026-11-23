// Agenda de la empresa. Las fechas llegan con zona horaria explícita y se guardan en UTC.
import { prisma } from '../lib/prisma';
import { ErrorApp } from '../lib/errores';
import { registrarAuditoria } from '../lib/auditoria';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from '../lib/listados';
import { Usuario } from './contexto';

export const ORDEN_EVENTOS = ['inicio', 'titulo', 'id'] as const;
const SELECCION = { id: true, titulo: true, descripcion: true, inicio: true, fin: true, ubicacion: true, creadoPorId: true } as const;
const FECHA_CON_ZONA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

// Acepta solo fechas ISO con zona horaria (Z o desplazamiento). Sin zona, rechaza.
export function fechaConZona(valor: unknown, nombre: string): Date {
  if (typeof valor !== 'string' || !FECHA_CON_ZONA.test(valor)) {
    throw new ErrorApp(400, `${nombre}: fecha sin zona horaria o no válida (ejemplo: 2026-12-01T10:00:00+01:00)`);
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ErrorApp(400, `${nombre}: fecha no válida`);
  return fecha;
}

function comprobarRango(inicio: Date, fin: Date) {
  if (fin <= inicio) throw new ErrorApp(400, 'La fecha de fin debe ser posterior al inicio');
}

export async function crearEvento(
  usuario: Usuario,
  datos: { titulo: string; descripcion: string | null; inicio: Date; fin: Date; ubicacion: string | null },
) {
  comprobarRango(datos.inicio, datos.fin);
  return prisma.$transaction(async (tx) => {
    const evento = await tx.evento.create({
      data: { tenantId: usuario.tenantId, creadoPorId: usuario.id, ...datos },
      select: SELECCION,
    });
    await registrarAuditoria(tx, {
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      entidad: 'Evento',
      entidadId: evento.id,
      accion: 'CREAR',
      cambios: { titulo: evento.titulo },
    });
    return evento;
  });
}

// Eventos que se solapan con el intervalo [desde, hasta).
export async function listarEventos(tenantId: string, desde: Date, hasta: Date, params: ParamsListado) {
  const where = { tenantId, inicio: { lt: hasta }, fin: { gt: desde } };
  const [datos, total] = await prisma.$transaction([
    prisma.evento.findMany({ where, select: SELECCION, orderBy: ordenPrisma(params), ...paginacion(params) }),
    prisma.evento.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}

async function eventoEditable(usuario: Usuario, id: string) {
  const evento = await prisma.evento.findFirst({ where: { id, tenantId: usuario.tenantId } });
  if (!evento) throw new ErrorApp(404, 'No encontrado');
  if (usuario.rol !== 'SUPERADMIN' && evento.creadoPorId !== usuario.id) {
    throw new ErrorApp(403, 'Solo puedes modificar tus eventos');
  }
  return evento;
}

export async function actualizarEvento(
  usuario: Usuario,
  id: string,
  cambios: { titulo?: string; descripcion?: string | null; inicio?: Date; fin?: Date; ubicacion?: string | null },
) {
  const antes = await eventoEditable(usuario, id);
  comprobarRango(cambios.inicio ?? antes.inicio, cambios.fin ?? antes.fin);
  return prisma.$transaction(async (tx) => {
    const despues = await tx.evento.update({ where: { id }, data: cambios, select: SELECCION });
    await registrarAuditoria(tx, {
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      entidad: 'Evento',
      entidadId: id,
      accion: 'EDITAR',
      cambios: { campos: Object.keys(cambios) },
    });
    return despues;
  });
}

export async function eliminarEvento(usuario: Usuario, id: string) {
  const evento = await eventoEditable(usuario, id);
  return prisma.$transaction(async (tx) => {
    await tx.evento.delete({ where: { id } });
    await registrarAuditoria(tx, {
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      entidad: 'Evento',
      entidadId: id,
      accion: 'BORRAR',
      cambios: { titulo: evento.titulo },
    });
    return { eliminado: true };
  });
}
