// Autenticación: login, 2FA (TOTP), sesiones con refresco rotado y bloqueo por usuario.
import { Usuario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cargarConfig } from '../config';
import { ErrorApp } from '../lib/errores';
import { cifrar, descifrar, hashPassword, hashToken, tokenOpaco, verificarPassword } from '../lib/criptografia';
import { generarSecretoTOTP, uriOtpauth, verificarTOTP } from '../lib/totp';
import { firmarAcceso, firmarPreDosFactores, verificarPreDosFactores } from '../lib/tokens';
import { registrarAuditoria } from '../lib/auditoria';

const LIMITE_FALLOS = 5;
const DURACION_BLOQUEO_MS = 15 * 60 * 1000;
const DURACION_REFRESCO_MS = 7 * 24 * 60 * 60 * 1000;
const EMISOR_2FA = 'Cryptofront';
const MSG_CREDENCIALES = 'Credenciales no válidas';

// Hash de referencia para igualar el tiempo de respuesta cuando el usuario no existe.
let hashReferencia: string | null = null;
function verificarFicticio(password: string) {
  hashReferencia ??= hashPassword('referencia-para-igualar-tiempos');
  verificarPassword(password, hashReferencia);
}

export interface UsuarioPublico {
  id: string;
  email: string;
  nombre: string;
  tenantId: string;
  rol: string;
  twoFactorActivo: boolean;
  idioma: string;
}

export interface ResultadoSesion {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioPublico;
}

export type ResultadoLogin =
  | ({ requiere2fa: false } & ResultadoSesion)
  | { requiere2fa: true; preToken: string };

async function publico(u: Usuario): Promise<UsuarioPublico> {
  const empresa = await prisma.tenant.findUnique({ where: { id: u.tenantId }, select: { idioma: true } });
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    tenantId: u.tenantId,
    rol: u.rol,
    twoFactorActivo: u.twoFactorActivo,
    idioma: empresa?.idioma ?? 'es',
  };
}

function comprobarBloqueo(u: Usuario) {
  if (u.bloqueadoHasta && u.bloqueadoHasta > new Date()) {
    throw new ErrorApp(423, 'Cuenta bloqueada temporalmente. Inténtalo más tarde.');
  }
}

// Evento de seguridad sobre un usuario (sin datos sensibles).
async function registrarEvento(usuarioId: string, evento: string) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { tenantId: true } });
  await registrarAuditoria(prisma, {
    tenantId: u?.tenantId ?? null,
    actorId: usuarioId,
    entidad: 'Usuario',
    entidadId: usuarioId,
    accion: 'EVENTO',
    cambios: { evento },
  });
}

async function registrarFallo(usuarioId: string) {
  const actual = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { intentosFallidos: { increment: 1 } },
  });
  await registrarAuditoria(prisma, {
    tenantId: actual.tenantId,
    actorId: usuarioId,
    entidad: 'Usuario',
    entidadId: usuarioId,
    accion: 'EVENTO',
    cambios: { evento: 'FALLO_AUTENTICACION' },
  });
  if (actual.intentosFallidos >= LIMITE_FALLOS) {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { intentosFallidos: 0, bloqueadoHasta: new Date(Date.now() + DURACION_BLOQUEO_MS) },
    });
    await registrarAuditoria(prisma, {
      tenantId: actual.tenantId,
      actorId: usuarioId,
      entidad: 'Usuario',
      entidadId: usuarioId,
      accion: 'EVENTO',
      cambios: { evento: 'CUENTA_BLOQUEADA', minutos: DURACION_BLOQUEO_MS / 60000 },
    });
  }
}

async function registrarExito(usuarioId: string) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });
}

async function crearSesion(u: Usuario): Promise<ResultadoSesion> {
  const secreto = cargarConfig().jwtSecret;
  const refreshToken = tokenOpaco();
  await prisma.sesionRefresco.create({
    data: {
      usuarioId: u.id,
      tokenHash: hashToken(refreshToken),
      expiraEn: new Date(Date.now() + DURACION_REFRESCO_MS),
    },
  });
  // El rol del token se confirma en cada petición contra la base de datos (ver middleware/sesion.ts).
  return { accessToken: firmarAcceso(u, secreto), refreshToken, usuario: await publico(u) };
}

export async function login(email: string, password: string): Promise<ResultadoLogin> {
  const u = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!u || !u.activo) {
    verificarFicticio(password);
    throw new ErrorApp(401, MSG_CREDENCIALES);
  }
  comprobarBloqueo(u);
  if (!verificarPassword(password, u.passwordHash)) {
    await registrarFallo(u.id);
    throw new ErrorApp(401, MSG_CREDENCIALES);
  }
  await registrarExito(u.id);

  if (u.twoFactorActivo) {
    const preToken = firmarPreDosFactores(u, cargarConfig().jwtSecret);
    return { requiere2fa: true, preToken };
  }
  return { requiere2fa: false, ...(await crearSesion(u)) };
}

export async function verificarDosFactores(preToken: string, codigo: string): Promise<ResultadoSesion> {
  const { sub } = verificarPreDosFactores(preToken, cargarConfig().jwtSecret);
  const u = await prisma.usuario.findUnique({ where: { id: sub } });
  if (!u || !u.activo || !u.twoFactorActivo || !u.twoFactorSecretoCifrado) {
    throw new ErrorApp(401, 'Token no válido o caducado');
  }
  comprobarBloqueo(u);
  const secreto = descifrar(u.twoFactorSecretoCifrado, cargarConfig().secretsMasterKey);
  if (!verificarTOTP(secreto, codigo)) {
    await registrarFallo(u.id);
    throw new ErrorApp(401, 'Código no válido');
  }
  await registrarExito(u.id);
  return crearSesion(u);
}

// Inicia la configuración del 2FA. El secreto se devuelve una sola vez y queda pendiente
// hasta que se confirme con un código válido. Si ya está activo, no se sobrescribe.
export async function configurar2FA(usuarioId: string) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!u) throw new ErrorApp(401, 'Sesión no válida');
  if (u.twoFactorActivo) throw new ErrorApp(409, 'El 2FA ya está activo');

  const secreto = generarSecretoTOTP();
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { twoFactorPendienteCifrado: cifrar(secreto, cargarConfig().secretsMasterKey) },
  });
  return { secreto, uri: uriOtpauth(secreto, u.email, EMISOR_2FA) };
}

export async function activar2FA(usuarioId: string, codigo: string) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!u) throw new ErrorApp(401, 'Sesión no válida');
  if (u.twoFactorActivo) throw new ErrorApp(409, 'El 2FA ya está activo');
  if (!u.twoFactorPendienteCifrado) throw new ErrorApp(409, 'No hay configuración del 2FA pendiente');
  comprobarBloqueo(u);

  const secreto = descifrar(u.twoFactorPendienteCifrado, cargarConfig().secretsMasterKey);
  if (!verificarTOTP(secreto, codigo)) {
    await registrarFallo(usuarioId);
    throw new ErrorApp(401, 'Código no válido');
  }
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      twoFactorActivo: true,
      twoFactorSecretoCifrado: u.twoFactorPendienteCifrado,
      twoFactorPendienteCifrado: null,
    },
  });
  await registrarExito(usuarioId);
  await registrarEvento(usuarioId, 'DOS_FACTORES_ACTIVADO');
  return { twoFactorActivo: true };
}

async function revocarTodas(usuarioId: string) {
  await prisma.sesionRefresco.updateMany({
    where: { usuarioId, revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
}

// Rota el token de refresco: el anterior queda revocado y se emite uno nuevo.
// Si llega un token ya revocado, alguien lo está reutilizando: se cierran todas las sesiones del usuario.
export async function refrescar(refreshToken: string): Promise<ResultadoSesion> {
  const sesion = await prisma.sesionRefresco.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!sesion) throw new ErrorApp(401, 'Sesión no válida');
  if (sesion.revocadaEn) {
    await registrarEvento(sesion.usuarioId, 'REUTILIZACION_REFRESCO');
    await revocarTodas(sesion.usuarioId);
    throw new ErrorApp(401, 'Sesión no válida');
  }
  if (sesion.expiraEn <= new Date()) throw new ErrorApp(401, 'Sesión caducada');

  // Marcado atómico: si dos peticiones llegan a la vez, solo una gana.
  const marcada = await prisma.sesionRefresco.updateMany({
    where: { id: sesion.id, revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
  if (marcada.count === 0) {
    await registrarEvento(sesion.usuarioId, 'REUTILIZACION_REFRESCO');
    await revocarTodas(sesion.usuarioId);
    throw new ErrorApp(401, 'Sesión no válida');
  }

  const u = await prisma.usuario.findUnique({ where: { id: sesion.usuarioId } });
  if (!u || !u.activo) throw new ErrorApp(401, 'Sesión no válida');
  return crearSesion(u);
}

export async function cerrarSesion(refreshToken: string) {
  await prisma.sesionRefresco.updateMany({
    where: { tokenHash: hashToken(refreshToken), revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
}

export async function obtenerUsuario(usuarioId: string): Promise<UsuarioPublico | null> {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  return u && u.activo ? await publico(u) : null;
}
