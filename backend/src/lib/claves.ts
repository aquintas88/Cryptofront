import { randomInt } from 'crypto';
import { ErrorApp } from './errores';

// Claves temporales legibles: sin caracteres ambiguos (0/O, 1/l/I). 12 caracteres, ~70 bits.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LONGITUD_CLAVE_TEMPORAL = 12;
export const LONGITUD_MINIMA = 12;

export function generarClaveTemporal(): string {
  let clave = '';
  for (let i = 0; i < LONGITUD_CLAVE_TEMPORAL; i++) clave += ALFABETO[randomInt(ALFABETO.length)];
  return clave;
}

// Política de contraseñas nuevas: mínimo 12 caracteres y distinta de la actual.
export function validarClaveNueva(nueva: string, actual?: string): void {
  if (nueva.length < LONGITUD_MINIMA) throw new ErrorApp(400, `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`);
  if (nueva.length > 200) throw new ErrorApp(400, 'La contraseña es demasiado larga');
  if (actual !== undefined && nueva === actual) throw new ErrorApp(400, 'La nueva contraseña debe ser distinta de la actual');
}
