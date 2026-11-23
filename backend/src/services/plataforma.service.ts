import type { IdiomaCliente } from '../lib/idiomas';
// Gestión de empresas (tenants) desde la plataforma. Solo lo usan usuarios con rol SUPERADMIN.
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/criptografia';
import { ErrorApp } from '../lib/errores';

export interface DatosDirector {
  nombre: string;
  email: string;
  password: string;
}

// Crea la empresa y, si se indica, su primer director, en una sola transacción.
export async function crearEmpresa(nombre: string, director?: DatosDirector, idioma: IdiomaCliente = 'es') {
  return prisma.$transaction(async (tx) => {
    const empresa = await tx.tenant.create({ data: { nombre, idioma } });
    let directorCreado: { id: string; email: string; nombre: string } | null = null;
    if (director) {
      const usuario = await tx.usuario.create({
        data: {
          tenantId: empresa.id,
          rol: 'USUARIO',
          email: director.email,
          nombre: director.nombre,
          passwordHash: hashPassword(director.password),
        },
        select: { id: true, email: true, nombre: true },
      });
      directorCreado = usuario;
    }
    return { empresa: { id: empresa.id, nombre: empresa.nombre, activa: empresa.activa }, director: directorCreado };
  }).catch((error: unknown) => {
    if (esDuplicado(error)) throw new ErrorApp(409, 'El email ya está registrado');
    throw error;
  });
}

export async function listarEmpresas() {
  return prisma.tenant.findMany({
    where: { esPlataforma: false },
    select: { id: true, nombre: true, activa: true, creadaEn: true },
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
  });
}

// Código de Prisma para restricciones únicas (P2002).
export function esDuplicado(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

// Historial de cargas de todas las empresas, la más reciente primero.
export async function listarCargas() {
  return prisma.cargaInversion.findMany({
    orderBy: { fechaCarga: 'desc' },
    take: 200,
    select: {
      id: true, fechaCarga: true, origen: true, estado: true,
      filasRecibidas: true, filasAceptadas: true, erroresResumen: true,
      tenant: { select: { nombre: true } },
    },
  });
}
