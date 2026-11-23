import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Contraseñas: scrypt de Node (sin dependencias). Formato: scrypt$<sal>$<clave>, ambos en base64.
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const LONGITUD_CLAVE = 64;

export function hashPassword(password: string): string {
  const sal = randomBytes(16);
  const clave = scryptSync(password, sal, LONGITUD_CLAVE, SCRYPT);
  return `scrypt$${sal.toString('base64')}$${clave.toString('base64')}`;
}

export function verificarPassword(password: string, almacenado: string): boolean {
  const [alg, salB64, claveB64] = almacenado.split('$');
  if (alg !== 'scrypt' || !salB64 || !claveB64) return false;
  const esperada = Buffer.from(claveB64, 'base64');
  const calculada = scryptSync(password, Buffer.from(salB64, 'base64'), esperada.length, SCRYPT);
  return esperada.length === calculada.length && timingSafeEqual(calculada, esperada);
}

// Cifrado de secretos en reposo: AES-256-GCM. Formato: v1:<iv>:<etiqueta>:<texto>, todo en base64.
export function cifrar(texto: string, clave: Buffer): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', clave, iv);
  const contenido = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  return ['v1', iv.toString('base64'), etiqueta.toString('base64'), contenido.toString('base64')].join(':');
}

export function descifrar(dato: string, clave: Buffer): string {
  const partes = dato.split(':');
  if (partes.length !== 4 || partes[0] !== 'v1') throw new Error('Formato de secreto cifrado no válido');
  const [, ivB64, etiquetaB64, contenidoB64] = partes;
  const descifrador = createDecipheriv('aes-256-gcm', clave, Buffer.from(ivB64, 'base64'));
  descifrador.setAuthTag(Buffer.from(etiquetaB64, 'base64'));
  return Buffer.concat([
    descifrador.update(Buffer.from(contenidoB64, 'base64')),
    descifrador.final(),
  ]).toString('utf8');
}

// Tokens opacos (refresco): valor aleatorio para el cliente; en BD solo su hash.
export function tokenOpaco(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
