import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from './listados';

// Campos que nunca se guardan en la auditoría, ni siquiera como diferencia.
const CLAVES_SENSIBLES = /pass|secret|token|cifrad|valor|twofactor|hash|pendiente/i;

type Cliente = Prisma.TransactionClient | typeof prisma;

export function sanear(obj: Record<string, unknown>): Record<string, unknown> {
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(obj)) {
    if (CLAVES_SENSIBLES.test(clave)) continue;
    limpio[clave] = valor;
  }
  return limpio;
}

// Diferencias entre el estado anterior y el nuevo, solo de los campos que cambian.
export function diferencias(
  antes: Record<string, unknown>,
  despues: Record<string, unknown>,
): Record<string, { antes: unknown; despues: unknown }> {
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const clave of Object.keys(despues)) {
    if (CLAVES_SENSIBLES.test(clave)) continue;
    if (JSON.stringify(antes[clave]) !== JSON.stringify(despues[clave])) {
      cambios[clave] = { antes: antes[clave], despues: despues[clave] };
    }
  }
  return cambios;
}

export interface EntradaAuditoria {
  tenantId: string | null;
  actorId: string;
  entidad: string;
  entidadId: string | null;
  accion: 'CREAR' | 'EDITAR' | 'BORRAR' | 'EVENTO';
  cambios?: Record<string, unknown>;
}

// Úsese dentro de la misma transacción que el cambio: si no se puede auditar, el cambio no se hace.
export async function registrarAuditoria(cliente: Cliente, entrada: EntradaAuditoria) {
  await cliente.registroAuditoria.create({
    data: {
      tenantId: entrada.tenantId,
      actorId: entrada.actorId,
      entidad: entrada.entidad,
      entidadId: entrada.entidadId,
      accion: entrada.accion,
      cambios: entrada.cambios ? (sanear(entrada.cambios) as Prisma.InputJsonValue) : undefined,
    },
  });
}

export const ORDEN_AUDITORIA = ['creadoEn', 'entidad', 'accion', 'id'] as const;

// Consulta paginada de la auditoría de una empresa. Por defecto, más reciente primero.
export async function listarAuditoria(tenantId: string, params: ParamsListado) {
  const where = { tenantId };
  const [datos, total] = await prisma.$transaction([
    prisma.registroAuditoria.findMany({
      where,
      select: { id: true, actorId: true, entidad: true, entidadId: true, accion: true, cambios: true, creadoEn: true },
      orderBy: ordenPrisma(params),
      ...paginacion(params),
    }),
    prisma.registroAuditoria.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}
