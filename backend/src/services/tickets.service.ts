// Tickets de soporte. Quien crea un ticket lo ve y puede comentar; el director ve y gestiona todos.
import { prisma } from '../lib/prisma';
import { ErrorApp } from '../lib/errores';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from '../lib/listados';
import { Usuario } from './contexto';

export const ORDEN_TICKETS = ['creadoEn', 'actualizadoEn', 'estado', 'criticidad', 'id'] as const;
const ESTADOS = ['ABIERTO', 'EN_CURSO', 'RESUELTO', 'CERRADO'] as const;
const CRITICIDADES = ['BAJA', 'MEDIA', 'ALTA'] as const;
const SELECCION = {
  id: true, asunto: true, descripcion: true, estado: true, criticidad: true,
  creadoPorId: true, asignadoAId: true, creadoEn: true, actualizadoEn: true,
} as const;

function visibilidad(usuario: Usuario) {
  return usuario.rol === 'DIRECTOR_EMPRESA'
    ? { tenantId: usuario.tenantId }
    : { tenantId: usuario.tenantId, creadoPorId: usuario.id };
}

export function validarEstado(valor: unknown): (typeof ESTADOS)[number] {
  if (!ESTADOS.includes(valor as (typeof ESTADOS)[number])) throw new ErrorApp(400, 'Estado no válido');
  return valor as (typeof ESTADOS)[number];
}

export function validarCriticidad(valor: unknown): (typeof CRITICIDADES)[number] {
  if (!CRITICIDADES.includes(valor as (typeof CRITICIDADES)[number])) throw new ErrorApp(400, 'Criticidad no válida');
  return valor as (typeof CRITICIDADES)[number];
}

export async function crearTicket(
  usuario: Usuario,
  datos: { asunto: string; descripcion: string; criticidad: (typeof CRITICIDADES)[number] },
) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: { tenantId: usuario.tenantId, creadoPorId: usuario.id, ...datos },
      select: SELECCION,
    });
    await tx.ticketHistorial.create({ data: { ticketId: ticket.id, autorId: usuario.id, cambio: 'Ticket creado' } });
    return ticket;
  });
}

export async function listarTickets(usuario: Usuario, params: ParamsListado) {
  const where = visibilidad(usuario);
  const [datos, total] = await prisma.$transaction([
    prisma.ticket.findMany({ where, select: SELECCION, orderBy: ordenPrisma(params), ...paginacion(params) }),
    prisma.ticket.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}

export async function obtenerTicket(usuario: Usuario, id: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, ...visibilidad(usuario) },
    select: { ...SELECCION, historial: { select: { autorId: true, cambio: true, creadoEn: true }, orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }] } },
  });
  if (!ticket) throw new ErrorApp(404, 'No encontrado');
  return ticket;
}

// Solo el director cambia estado, criticidad o asignación. Cada cambio queda en el historial.
export async function actualizarTicket(
  usuario: Usuario,
  id: string,
  cambios: { estado?: (typeof ESTADOS)[number]; criticidad?: (typeof CRITICIDADES)[number]; asignadoAId?: string | null },
) {
  const antes = await prisma.ticket.findFirst({ where: { id, tenantId: usuario.tenantId } });
  if (!antes) throw new ErrorApp(404, 'No encontrado');
  if (cambios.asignadoAId) {
    const asignado = await prisma.usuario.findFirst({ where: { id: cambios.asignadoAId, tenantId: usuario.tenantId } });
    if (!asignado) throw new ErrorApp(400, 'Asignación no válida');
  }
  return prisma.$transaction(async (tx) => {
    const despues = await tx.ticket.update({ where: { id }, data: cambios, select: SELECCION });
    const entradas: string[] = [];
    if (cambios.estado && cambios.estado !== antes.estado) entradas.push(`Estado: ${antes.estado} → ${cambios.estado}`);
    if (cambios.criticidad && cambios.criticidad !== antes.criticidad) entradas.push(`Criticidad: ${antes.criticidad} → ${cambios.criticidad}`);
    if (cambios.asignadoAId !== undefined && cambios.asignadoAId !== antes.asignadoAId) entradas.push('Asignación cambiada');
    for (const cambio of entradas) {
      await tx.ticketHistorial.create({ data: { ticketId: id, autorId: usuario.id, cambio } });
    }
    return despues;
  });
}

// Comentario: lo pueden añadir quien creó el ticket y el director.
export async function comentarTicket(usuario: Usuario, id: string, texto: string) {
  const ticket = await prisma.ticket.findFirst({ where: { id, ...visibilidad(usuario) }, select: { id: true } });
  if (!ticket) throw new ErrorApp(404, 'No encontrado');
  await prisma.ticketHistorial.create({ data: { ticketId: id, autorId: usuario.id, cambio: `Comentario: ${texto}` } });
  return { ok: true };
}
