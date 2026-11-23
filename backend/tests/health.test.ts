import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';

describe('GET /health', () => {
  const app = crearApp();

  it('responde 200 con estado ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', servicio: 'cryptofront-backend' });
  });

  it('no revela la tecnología del servidor', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('envía cabeceras de seguridad de helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('devuelve 404 JSON para rutas desconocidas', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No encontrado' });
  });
});
