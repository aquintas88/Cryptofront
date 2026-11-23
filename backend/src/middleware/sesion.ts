import { NextFunction, Request, Response } from 'express';
import { cargarConfig } from '../config';
import { prisma } from '../lib/prisma';
import { ErrorApp } from '../lib/errores';
import { verificarAcceso } from '../lib/tokens';

const RUTAS_PERMITIDAS_CON_CLAVE_TEMPORAL = ['/api/auth/cambiar-password', '/api/auth/salir', '/api/auth/yo'];

// Exige un token de acceso válido. Comprueba en cada petición que el usuario sigue activo,
// que pertenece al tenant del token y toma el rol de la base de datos (no del token),
// así que desactivar a alguien o cambiarle el rol surte efecto de inmediato.
export async function requiereSesion(req: Request, res: Response, next: NextFunction) {
  try {
    const cabecera = req.headers.authorization;
    if (!cabecera?.startsWith('Bearer ')) throw new ErrorApp(401, 'Token requerido');

    const { sub, tenantId } = verificarAcceso(cabecera.slice(7), cargarConfig().jwtSecret);
    const u = await prisma.usuario.findUnique({ where: { id: sub } });
    if (!u || !u.activo || u.tenantId !== tenantId) throw new ErrorApp(401, 'Sesión no válida');

    // Con clave temporal, solo se puede cambiar la contraseña o cerrar sesión.
    const ruta = req.originalUrl.split('?')[0];
    if (u.debeCambiarPassword && !RUTAS_PERMITIDAS_CON_CLAVE_TEMPORAL.includes(ruta)) {
      throw new ErrorApp(403, 'Debe cambiar la contraseña antes de continuar');
    }

    res.locals.usuario = { id: u.id, tenantId: u.tenantId, rol: u.rol };
    next();
  } catch (error) {
    next(error);
  }
}

// Exige uno de los roles indicados. Debe usarse después de requiereSesion.
export function requiereRol(...roles: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const usuario = res.locals.usuario as { rol: string } | undefined;
    if (!usuario || !roles.includes(usuario.rol)) {
      next(new ErrorApp(403, 'Acceso denegado'));
      return;
    }
    next();
  };
}
