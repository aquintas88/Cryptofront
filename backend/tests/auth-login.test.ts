import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { crearUsuario, limpiarBD } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

describe('login', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('con credenciales correctas devuelve sesión y no revela la contraseña', async () => {
    const { usuario, password } = await crearUsuario();
    const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password });
    expect(res.status).toBe(200);
    expect(res.body.requiere2fa).toBe(false);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.usuario.id).toBe(usuario.id);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('el email no distingue mayúsculas ni espacios', async () => {
    const { usuario, password } = await crearUsuario({ email: 'mayus@ejemplo.test' });
    const res = await request(app).post('/api/auth/login').send({ email: '  MAYUS@ejemplo.test ', password });
    expect(res.status).toBe(200);
    expect(res.body.usuario.id).toBe(usuario.id);
  });

  it('contraseña incorrecta y email desconocido dan la misma respuesta', async () => {
    const { usuario } = await crearUsuario();
    const mala = await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'mala' });
    const inexistente = await request(app).post('/api/auth/login').send({ email: 'nadie@ejemplo.test', password: 'x' });
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.body).toEqual(inexistente.body);
  });

  it('un usuario inactivo no puede entrar aunque la contraseña sea correcta', async () => {
    const { usuario, password } = await crearUsuario({ activo: false });
    const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password });
    expect(res.status).toBe(401);
  });

  it('tras 5 fallos la cuenta se bloquea, incluso con la contraseña correcta', async () => {
    const { usuario, password } = await crearUsuario();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'mala' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password });
    expect(res.status).toBe(423);
  });

  it('el bloqueo caduca y el usuario vuelve a entrar', async () => {
    const { usuario, password } = await crearUsuario();
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { bloqueadoHasta: new Date(Date.now() - 1000) },
    });
    const res = await request(app).post('/api/auth/login').send({ email: usuario.email, password });
    expect(res.status).toBe(200);
  });

  it('un acierto pone el contador de fallos a cero', async () => {
    const { usuario, password } = await crearUsuario();
    for (let i = 0; i < 4; i++) {
      await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'mala' });
    }
    await request(app).post('/api/auth/login').send({ email: usuario.email, password });
    const fresco = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(fresco.intentosFallidos).toBe(0);
  });

  it('valida el formato de la petición', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 123, password: 'x' });
    expect(res.status).toBe(400);
  });
});
