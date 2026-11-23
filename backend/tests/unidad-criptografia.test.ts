import { describe, it, expect } from 'vitest';
import { randomBytes } from 'crypto';
import { hashPassword, verificarPassword, cifrar, descifrar, tokenOpaco, hashToken } from '../src/lib/criptografia';
import { codigoTOTP, verificarTOTP, generarSecretoTOTP, base32Codificar, base32Decodificar } from '../src/lib/totp';

describe('contraseñas (scrypt)', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', () => {
    const h = hashPassword('contraseña-ficticia-1');
    expect(verificarPassword('contraseña-ficticia-1', h)).toBe(true);
    expect(verificarPassword('otra', h)).toBe(false);
  });

  it('no guarda la contraseña en claro y usa sal aleatoria', () => {
    const a = hashPassword('igual');
    const b = hashPassword('igual');
    expect(a).not.toContain('igual');
    expect(a).not.toBe(b);
  });

  it('rechaza un hash con formato desconocido', () => {
    expect(verificarPassword('x', 'md5$abc$def')).toBe(false);
  });
});

describe('cifrado de secretos (AES-256-GCM)', () => {
  const clave = randomBytes(32);

  it('descifra lo que cifra', () => {
    const cifrado = cifrar('JBSWY3DPEHPK3PXP', clave);
    expect(cifrado).not.toContain('JBSWY3DPEHPK3PXP');
    expect(descifrar(cifrado, clave)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('detecta manipulación del texto cifrado', () => {
    const partes = cifrar('secreto', clave).split(':');
    const contenido = Buffer.from(partes[3], 'base64');
    contenido[0] ^= 1;
    partes[3] = contenido.toString('base64');
    expect(() => descifrar(partes.join(':'), clave)).toThrow();
  });

  it('no descifra con otra clave', () => {
    const cifrado = cifrar('secreto', clave);
    expect(() => descifrar(cifrado, randomBytes(32))).toThrow();
  });
});

describe('tokens opacos', () => {
  it('son distintos en cada llamada y su hash es estable', () => {
    const t = tokenOpaco();
    expect(tokenOpaco()).not.toBe(t);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });
});

describe('TOTP (RFC 6238)', () => {
  // Vector de prueba de la RFC 6238: secreto ASCII "12345678901234567890", T = 59 s → contador 1 → 287082.
  const secreto = base32Codificar(Buffer.from('12345678901234567890', 'ascii'));

  it('reproduce el vector de la RFC 6238', () => {
    expect(codigoTOTP(secreto, 1)).toBe('287082');
  });

  it('acepta el código del paso actual y de un paso adyacente', () => {
    const ahora = 59_000;
    expect(verificarTOTP(secreto, '287082', ahora)).toBe(true);
    expect(verificarTOTP(secreto, '287082', ahora + 30_000)).toBe(true);
  });

  it('rechaza códigos fuera de la ventana y con formato incorrecto', () => {
    expect(verificarTOTP(secreto, '287082', 59_000 + 120_000)).toBe(false);
    expect(verificarTOTP(secreto, '28708', 59_000)).toBe(false);
    expect(verificarTOTP(secreto, 'abcdef', 59_000)).toBe(false);
  });

  it('base32 es reversible', () => {
    const datos = randomBytes(20);
    expect(base32Decodificar(base32Codificar(datos)).equals(datos)).toBe(true);
    expect(generarSecretoTOTP()).toMatch(/^[A-Z2-7]+$/);
  });
});
