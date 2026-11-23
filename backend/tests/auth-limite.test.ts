import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { limpiarBD } from './helpers';

describe('límite de intentos de autenticación por IP', () => {
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('tras superar el límite responde 429 aunque las credenciales sean de prueba', async () => {
    const app = crearApp({ limiteAuth: 3 });
    const respuestas = [];
    for (let i = 0; i < 4; i++) {
      respuestas.push(await request(app).post('/api/auth/login').send({ email: 'x@ejemplo.test', password: 'x' }));
    }
    expect(respuestas.slice(0, 3).map((r) => r.status)).toEqual([401, 401, 401]);
    expect(respuestas[3].status).toBe(429);
  });

  it('el límite no afecta a rutas fuera de /api/auth', async () => {
    const app = crearApp({ limiteAuth: 1 });
    await request(app).post('/api/auth/login').send({});
    await request(app).post('/api/auth/login').send({});
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
