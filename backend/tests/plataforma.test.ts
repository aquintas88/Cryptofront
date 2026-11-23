import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { PASSWORD_PRUEBA, crearPlataforma, crearUsuario, emailUnico, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

describe('plataforma: alta de empresas', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('un usuario de plataforma crea una empresa con su primer director', async () => {
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const email = emailUnico('director');
    const res = await request(app)
      .post('/api/plataforma/empresas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Empresa nueva',
        director: { nombre: 'Directora ficticia', email, password: PASSWORD_PRUEBA },
      });
    expect(res.status).toBe(201);
    expect(res.body.director.email).toBe(email);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const dir = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    expect(dir.rol).toBe('DIRECTOR_EMPRESA');
    expect(dir.tenantId).toBe(res.body.empresa.id);
  });

  it('si el director no es válido, no se crea la empresa (transacción)', async () => {
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const antes = await prisma.tenant.count();
    const res = await request(app)
      .post('/api/plataforma/empresas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Sin director válido', director: { nombre: 'X', email: 'no-es-email', password: PASSWORD_PRUEBA } });
    expect(res.status).toBe(400);
    expect(await prisma.tenant.count()).toBe(antes);
  });

  it('el email de un director ya registrado no crea la empresa', async () => {
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const existente = await crearUsuario({ rol: 'USUARIO' });
    const antes = await prisma.tenant.count();
    const res = await request(app)
      .post('/api/plataforma/empresas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Duplicada',
        director: { nombre: 'Dup', email: existente.usuario.email, password: PASSWORD_PRUEBA },
      });
    expect(res.status).toBe(409);
    expect(await prisma.tenant.count()).toBe(antes);
  });

  it('un director de empresa no puede dar de alta empresas', async () => {
    await crearPlataforma();
    const empresaDir = await crearUsuario({ rol: 'DIRECTOR_EMPRESA' });
    const token = await tokenDe(app, empresaDir.usuario.email);
    const res = await request(app)
      .post('/api/plataforma/empresas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Intento' });
    expect(res.status).toBe(403);
  });

  it('el listado de empresas no incluye la empresa de la plataforma', async () => {
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    await request(app).post('/api/plataforma/empresas').set('Authorization', `Bearer ${token}`).send({ nombre: 'Cliente uno' });
    const res = await request(app).get('/api/plataforma/empresas').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const nombres = res.body.empresas.map((e: { nombre: string }) => e.nombre);
    expect(nombres).toEqual(['Cliente uno']);
  });
});
