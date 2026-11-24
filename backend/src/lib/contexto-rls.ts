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

// Acceso de gestión total a las tablas de inversiones: solo SUPERADMIN (los roles de empresa se han eliminado).
export function accesoTotal(rol: string): boolean {
  return rol === 'SUPERADMIN';
}

export async function conContextoRls<T>(
  usuario: UsuarioContexto,
  operacion: (tx: Prisma.TransactionClient) => Promise<T>,
  opciones: { timeout?: number } = {},
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT
      set_config('app.tenant_id', ${usuario.tenantId}, true),
      set_config('app.usuario_id', ${usuario.id}, true),
      set_config('app.acceso_total', ${accesoTotal(usuario.rol) ? 'on' : 'off'}, true)`;
    return operacion(tx);
  }, { timeout: opciones.timeout ?? 5000 });
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
