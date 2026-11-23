// Alertas. El director ve todas las de su empresa; el resto, las que le corresponden
// (propias o de toda la empresa, sin destinatario). Resolver: director o destinatario.
import { prisma } from '../lib/prisma';
import { ErrorApp } from '../lib/errores';
import { registrarAuditoria } from '../lib/auditoria';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from '../lib/listados';
import { Usuario } from './contexto';

export const ORDEN_ALERTAS = ['creadaEn', 'tipo', 'estado', 'id'] as const;
const SELECCION = { id: true, tipo: true, mensaje: true, estado: true, destinatarioId: true, creadaEn: true, resueltaEn: true } as const;

function visibilidad(usuario: Usuario) {
  if (usuario.rol === 'SUPERADMIN') return { tenantId: usuario.tenantId };
  return { tenantId: usuario.tenantId, OR: [{ destinatarioId: usuario.id }, { destinatarioId: null }] };
}

// Uso interno: lo llaman otros módulos para avisar a un usuario o a toda la empresa.
export async function crearAlerta(tenantId: string, datos: { tipo: string; mensaje: string; destinatarioId?: string | null }) {
  if (datos.destinatarioId) {
    const destino = await prisma.usuario.findFirst({ where: { id: datos.destinatarioId, tenantId } });
    if (!destino) throw new ErrorApp(400, 'Destinatario no válido');
  }
  return prisma.alerta.create({
    data: { tenantId, tipo: datos.tipo, mensaje: datos.mensaje, destinatarioId: datos.destinatarioId ?? null },
    select: SELECCION,
  });
}

export async function listarAlertas(usuario: Usuario, params: ParamsListado) {
  const where = visibilidad(usuario);
  const [datos, total] = await prisma.$transaction([
    prisma.alerta.findMany({ where, select: SELECCION, orderBy: ordenPrisma(params), ...paginacion(params) }),
    prisma.alerta.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}

export async function resolverAlerta(usuario: Usuario, id: string) {
  const alerta = await prisma.alerta.findFirst({ where: { id, ...visibilidad(usuario) }, select: SELECCION });
  if (!alerta) throw new ErrorApp(404, 'No encontrada');
  if (alerta.estado === 'RESUELTA') return alerta;
  return prisma.$transaction(async (tx) => {
    const resuelta = await tx.alerta.update({
      where: { id },
      data: { estado: 'RESUELTA', resueltaEn: new Date() },
      select: SELECCION,
    });
    await registrarAuditoria(tx, {
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      entidad: 'Alerta',
      entidadId: id,
      accion: 'EDITAR',
      cambios: { estado: 'RESUELTA' },
    });
    return resuelta;
  });
}
