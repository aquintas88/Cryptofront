// Gestión dentro de una empresa: sucursales y usuarios. Todas las consultas filtran por tenantId.
// Un recurso de otra empresa se trata como inexistente (404), para no revelar que existe.
// Cada cambio y su registro de auditoría van en la misma transacción.
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/criptografia';
import { ErrorApp } from '../lib/errores';
import { diferencias, registrarAuditoria, sanear } from '../lib/auditoria';
import { esDuplicado } from './plataforma.service';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from '../lib/listados';

const ROLES_DE_EMPRESA = ['INVERSOR'] as const;

// Campos devueltos al cliente. Nunca hash, ni secretos 2FA, ni tokens.
const SELECCION_USUARIO = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
  activo: true,
  sucursalId: true,
  creadoEn: true,
} as const;

const SELECCION_SUCURSAL = { id: true, nombre: true, direccion: true, activa: true } as const;

export const ORDEN_SUCURSALES = ['nombre', 'activa', 'id'] as const;
export const ORDEN_USUARIOS = ['nombre', 'email', 'rol', 'activo', 'id'] as const;

export async function listarSucursales(tenantId: string, params: ParamsListado) {
  const where = { tenantId };
  const [datos, total] = await prisma.$transaction([
    prisma.sucursal.findMany({ where, select: SELECCION_SUCURSAL, orderBy: ordenPrisma(params), ...paginacion(params) }),
    prisma.sucursal.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}

export async function obtenerSucursal(tenantId: string, id: string) {
  const sucursal = await prisma.sucursal.findFirst({ where: { id, tenantId }, select: SELECCION_SUCURSAL });
  if (!sucursal) throw new ErrorApp(404, 'No encontrada');
  return sucursal;
}

export async function crearSucursal(
  tenantId: string,
  actorId: string,
  datos: { nombre: string; direccion: string | null },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const sucursal = await tx.sucursal.create({
        data: { tenantId, nombre: datos.nombre, direccion: datos.direccion },
        select: SELECCION_SUCURSAL,
      });
      await registrarAuditoria(tx, {
        tenantId,
        actorId,
        entidad: 'Sucursal',
        entidadId: sucursal.id,
        accion: 'CREAR',
        cambios: { nombre: sucursal.nombre, direccion: sucursal.direccion },
      });
      return sucursal;
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorApp(409, 'Ya existe una sucursal con ese nombre');
    throw error;
  }
}

export async function actualizarSucursal(
  tenantId: string,
  actorId: string,
  id: string,
  cambios: { nombre?: string; direccion?: string | null; activa?: boolean },
) {
  const antes = await prisma.sucursal.findFirst({ where: { id, tenantId }, select: SELECCION_SUCURSAL });
  if (!antes) throw new ErrorApp(404, 'No encontrada');
  try {
    return await prisma.$transaction(async (tx) => {
      const despues = await tx.sucursal.update({ where: { id }, data: cambios, select: SELECCION_SUCURSAL });
      const diff = diferencias(antes, despues);
      if (Object.keys(diff).length > 0) {
        await registrarAuditoria(tx, { tenantId, actorId, entidad: 'Sucursal', entidadId: id, accion: 'EDITAR', cambios: diff });
      }
      return despues;
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorApp(409, 'Ya existe una sucursal con ese nombre');
    throw error;
  }
}

export async function listarUsuarios(tenantId: string, params: ParamsListado) {
  const where = { tenantId };
  const [datos, total] = await prisma.$transaction([
    prisma.usuario.findMany({ where, select: SELECCION_USUARIO, orderBy: ordenPrisma(params), ...paginacion(params) }),
    prisma.usuario.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}

// Ficha de usuario: incluye el nombre de su sucursal. Sin datos sensibles.
export async function obtenerUsuario(tenantId: string, id: string) {
  const usuario = await prisma.usuario.findFirst({
    where: { id, tenantId },
    select: { ...SELECCION_USUARIO, sucursal: { select: { id: true, nombre: true } } },
  });
  if (!usuario) throw new ErrorApp(404, 'No encontrado');
  return usuario;
}

// Una sucursal solo puede asignarse si pertenece a la misma empresa.
async function sucursalDeEmpresa(tenantId: string, sucursalId: string | null) {
  if (sucursalId === null) return null;
  const sucursal = await prisma.sucursal.findFirst({ where: { id: sucursalId, tenantId } });
  if (!sucursal) throw new ErrorApp(400, 'Sucursal no válida');
  return sucursal.id;
}

export async function crearUsuario(
  tenantId: string,
  actorId: string,
  datos: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    sucursalId: string | null;
  },
) {
  if (!ROLES_DE_EMPRESA.includes(datos.rol as (typeof ROLES_DE_EMPRESA)[number])) {
    throw new ErrorApp(400, 'Rol no válido');
  }
  const sucursalId = await sucursalDeEmpresa(tenantId, datos.sucursalId);
  try {
    return await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          tenantId,
          nombre: datos.nombre,
          email: datos.email,
          passwordHash: hashPassword(datos.password),
          rol: datos.rol as (typeof ROLES_DE_EMPRESA)[number],
          sucursalId,
        },
        select: SELECCION_USUARIO,
      });
      await registrarAuditoria(tx, {
        tenantId,
        actorId,
        entidad: 'Usuario',
        entidadId: usuario.id,
        accion: 'CREAR',
        cambios: sanear({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, sucursalId: usuario.sucursalId }),
      });
      return usuario;
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorApp(409, 'El email ya está registrado');
    throw error;
  }
}

export async function actualizarUsuario(
  tenantId: string,
  actorId: string,
  id: string,
  cambios: {
    nombre?: string;
    rol?: string;
    activo?: boolean;
    sucursalId?: string | null;
  },
) {
  const antes = await prisma.usuario.findFirst({ where: { id, tenantId }, select: SELECCION_USUARIO });
  if (!antes) throw new ErrorApp(404, 'No encontrado');

  // Nadie se desactiva ni se degrada a sí mismo: evita quedarse sin administración.
  if (id === actorId) {
    if (cambios.activo === false || cambios.rol !== undefined) {
      throw new ErrorApp(409, 'No puedes desactivarte ni cambiarte el rol');
    }
  }
  if (cambios.rol !== undefined && !ROLES_DE_EMPRESA.includes(cambios.rol as (typeof ROLES_DE_EMPRESA)[number])) {
    throw new ErrorApp(400, 'Rol no válido');
  }
  const datos: Record<string, unknown> = { ...cambios };
  if (cambios.sucursalId !== undefined) {
    datos.sucursalId = await sucursalDeEmpresa(tenantId, cambios.sucursalId);
  }

  return prisma.$transaction(async (tx) => {
    const despues = await tx.usuario.update({ where: { id }, data: datos, select: SELECCION_USUARIO });
    const diff = diferencias(antes, despues);
    if (Object.keys(diff).length > 0) {
      await registrarAuditoria(tx, { tenantId, actorId, entidad: 'Usuario', entidadId: id, accion: 'EDITAR', cambios: diff });
    }
    // Al desactivar, se cierran todas sus sesiones de refresco.
    if (cambios.activo === false) {
      await tx.sesionRefresco.updateMany({
        where: { usuarioId: id, revocadaEn: null },
        data: { revocadaEn: new Date() },
      });
    }
    return despues;
  });
}
