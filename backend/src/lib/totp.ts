// TOTP (RFC 6238) con HMAC-SHA1, 6 dígitos y paso de 30 s. Sin dependencias.
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PASO_SEGUNDOS = 30;

export function base32Codificar(buffer: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = '';
  for (const byte of buffer) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO[(valor << (5 - bits)) & 31];
  return salida;
}

export function base32Decodificar(texto: string): Buffer {
  const limpio = texto.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const caracter of limpio) {
    const indice = ALFABETO.indexOf(caracter);
    if (indice < 0) throw new Error('Secreto base32 no válido');
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generarSecretoTOTP(): string {
  return base32Codificar(randomBytes(20));
}

export function codigoTOTP(secretoBase32: string, contador: number): string {
  const mensaje = Buffer.alloc(8);
  mensaje.writeBigUInt64BE(BigInt(contador));
  const hmac = createHmac('sha1', base32Decodificar(secretoBase32)).update(mensaje).digest();
  const desplazamiento = hmac[hmac.length - 1] & 0x0f;
  const binario =
    ((hmac[desplazamiento] & 0x7f) << 24) |
    (hmac[desplazamiento + 1] << 16) |
    (hmac[desplazamiento + 2] << 8) |
    hmac[desplazamiento + 3];
  return String(binario % 1_000_000).padStart(6, '0');
}

// Acepta el código del paso actual y de una ventana de tolerancia (por defecto ±1 paso).
export function verificarTOTP(secretoBase32: string, codigo: string, ahora = Date.now(), ventana = 1): boolean {
  if (!/^\d{6}$/.test(codigo)) return false;
  const contadorActual = Math.floor(ahora / 1000 / PASO_SEGUNDOS);
  const esperado = Buffer.from(codigo);
  for (let d = -ventana; d <= ventana; d++) {
    const candidato = Buffer.from(codigoTOTP(secretoBase32, contadorActual + d));
    if (timingSafeEqual(candidato, esperado)) return true;
  }
  return false;
}

export function uriOtpauth(secretoBase32: string, cuenta: string, emisor: string): string {
  const etiqueta = encodeURIComponent(`${emisor}:${cuenta}`);
  return `otpauth://totp/${etiqueta}?secret=${secretoBase32}&issuer=${encodeURIComponent(emisor)}&algorithm=SHA1&digits=6&period=${PASO_SEGUNDOS}`;
}
