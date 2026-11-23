// Contexto de Row-Level Security para las tablas de inversiones.
// Toda consulta sobre esas tablas debe ir dentro de conContextoRls: fija las variables de sesión
// que leen las políticas de Postgres (ver migración *_inversiones_rls). Como set_config(..., true)
// es local a la transacción, el contexto no se filtra a otras peticiones del pool.
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface UsuarioContexto {
  id: string;
  tenantId: string;
  rol: string;
}

// Decisión provisional (ver docs/estado-sesion.md): solo DIRECTOR_EMPRESA ve la gestión completa.
export function accesoTotal(rol: string): boolean {
  return rol === 'DIRECTOR_EMPRESA';
}

export async function conContextoRls<T>(
  usuario: UsuarioContexto,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT
      set_config('app.tenant_id', ${usuario.tenantId}, true),
      set_config('app.usuario_id', ${usuario.id}, true),
      set_config('app.acceso_total', ${accesoTotal(usuario.rol) ? 'on' : 'off'}, true)`;
    return operacion(tx);
  });
}

// Operación de la plataforma (SUPERADMIN) sobre una empresa concreta: acceso de gestión a esa empresa.
// Solo para operaciones que quedan registradas en la auditoría con el usuario que las hace.
export async function conContextoPlataforma<T>(
  actorId: string,
  tenantId: string,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT
      set_config('app.tenant_id', ${tenantId}, true),
      set_config('app.usuario_id', ${actorId}, true),
      set_config('app.acceso_total', 'on', true)`;
    return operacion(tx);
  });
}
