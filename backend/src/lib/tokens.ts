// Tokens de acceso (JWT HS256). El propósito (`purpose`) impide usar un token de un paso
// en otro: un token previo al 2FA nunca abre la API (lección L-03).
import jwt from 'jsonwebtoken';
import { ErrorApp } from './errores';

const EMISOR = 'cryptofront';
const DURACION_SESION = '1h';
const DURACION_PRE_2FA = '5m';

interface UsuarioToken {
  id: string;
  tenantId: string;
  rol: string;
}

export function firmarAcceso(usuario: UsuarioToken, secreto: string): string {
  return jwt.sign({ sub: usuario.id, tenantId: usuario.tenantId, rol: usuario.rol, purpose: 'sesion' }, secreto, {
    algorithm: 'HS256',
    expiresIn: DURACION_SESION,
    issuer: EMISOR,
  });
}

export function firmarPreDosFactores(usuario: Pick<UsuarioToken, 'id' | 'tenantId'>, secreto: string): string {
  return jwt.sign({ sub: usuario.id, tenantId: usuario.tenantId, purpose: 'pre2fa' }, secreto, {
    algorithm: 'HS256',
    expiresIn: DURACION_PRE_2FA,
    issuer: EMISOR,
  });
}

function verificar(token: string, secreto: string, purpose: string): { sub: string; tenantId: string; iat: number } {
  let carga: jwt.JwtPayload;
  try {
    carga = jwt.verify(token, secreto, { algorithms: ['HS256'], issuer: EMISOR }) as jwt.JwtPayload;
  } catch {
    throw new ErrorApp(401, 'Token no válido o caducado');
  }
  if (carga.purpose !== purpose || typeof carga.sub !== 'string' || typeof carga.tenantId !== 'string') {
    throw new ErrorApp(401, 'Token no válido o caducado');
  }
  return { sub: carga.sub, tenantId: carga.tenantId, iat: carga.iat ?? 0 };
}

export function verificarAcceso(token: string, secreto: string) {
  return verificar(token, secreto, 'sesion');
}

export function verificarPreDosFactores(token: string, secreto: string) {
  return verificar(token, secreto, 'pre2fa');
}
