import { describe, it, expect } from 'vitest';
import { cargarConfig } from '../src/config';

const clave = Buffer.alloc(32, 7).toString('base64');
const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 'a'.repeat(32), SECRETS_MASTER_KEY: clave };

describe('cargarConfig', () => {
  it('acepta una configuración completa', () => {
    const c = cargarConfig(base);
    expect(c.port).toBe(3000);
    expect(c.jwtSecret).toHaveLength(32);
    expect(c.secretsMasterKey).toHaveLength(32);
  });

  it('falla si falta JWT_SECRET (sin valor por defecto)', () => {
    expect(() => cargarConfig({ ...base, JWT_SECRET: undefined })).toThrow(/JWT_SECRET/);
  });

  it('falla si JWT_SECRET es demasiado corto', () => {
    expect(() => cargarConfig({ ...base, JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
  });

  it('falla si falta DATABASE_URL', () => {
    expect(() => cargarConfig({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('falla si falta SECRETS_MASTER_KEY', () => {
    expect(() => cargarConfig({ ...base, SECRETS_MASTER_KEY: undefined })).toThrow(/SECRETS_MASTER_KEY/);
  });

  it('falla si SECRETS_MASTER_KEY no tiene 32 bytes', () => {
    const corta = Buffer.alloc(16).toString('base64');
    expect(() => cargarConfig({ ...base, SECRETS_MASTER_KEY: corta })).toThrow(/32 bytes/);
  });
});
