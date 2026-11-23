import { ErrorApp } from './errores';

// Validación manual de entradas. Cada función lanza ErrorApp(400) con un mensaje que no revela datos.
export function texto(valor: unknown, nombre: string, { max = 200, min = 1 } = {}): string {
  if (typeof valor !== 'string') throw new ErrorApp(400, `Campo no válido: ${nombre}`);
  const limpio = valor.trim();
  if (limpio.length < min || limpio.length > max) throw new ErrorApp(400, `Campo no válido: ${nombre}`);
  return limpio;
}

export function textoOpcional(valor: unknown, nombre: string, max = 200): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  return texto(valor, nombre, { max });
}

export function email(valor: unknown): string {
  const limpio = texto(valor, 'email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) throw new ErrorApp(400, 'Email no válido');
  return limpio;
}

export function passwordNueva(valor: unknown): string {
  // Mínimo 12 caracteres (decisión de este paso). Máximo para evitar abusos de hashing.
  return texto(valor, 'password', { min: 12, max: 200 });
}

export function booleano(valor: unknown, nombre: string): boolean {
  if (typeof valor !== 'boolean') throw new ErrorApp(400, `Campo no válido: ${nombre}`);
  return valor;
}

export function idValido(valor: unknown, nombre: string): string {
  return texto(valor, nombre, { max: 64 });
}
