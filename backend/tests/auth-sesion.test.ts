import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cargarConfig } from '../src/config';
import { crearUsuario, limpiarBD } from './helpers';

const app = crearApp({ limiteAuth: 1000 });
const secreto = cargarConfig().jwtSecret;

async function iniciar(email: string, password: string) {
  return request(app).post('/api/auth/login').send({ email, password });
}

describe('sesión', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('/yo exige token', async () => {
    const res = await request(app).get('/api/auth/yo');
    expect(res.status).toBe(401);
  });

  it('/yo acepta el token de acceso y devuelve el usuario', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.usuario.id).toBe(usuario.id);
  });

  it('rechaza un token manipulado', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    const partes = login.body.accessToken.split('.');
    partes[1] = Buffer.from(JSON.stringify({ sub: 'otro', tenantId: 'otro', purpose: 'sesion' })).toString('base64url');
    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${partes.join('.')}`);
    expect(res.status).toBe(401);
  });

  it('rechaza un token caducado', async () => {
    const { usuario } = await crearUsuario();
    const caducado = jwt.sign(
      { sub: usuario.id, tenantId: usuario.tenantId, purpose: 'sesion', exp: Math.floor(Date.now() / 1000) - 10 },
      secreto,
      { algorithm: 'HS256', issuer: 'cryptofront' },
    );
    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${caducado}`);
    expect(res.status).toBe(401);
  });

  it('rechaza un token sin propósito de sesión', async () => {
    const { usuario } = await crearUsuario();
    const sinProposito = jwt.sign({ sub: usuario.id, tenantId: usuario.tenantId }, secreto, {
      algorithm: 'HS256',
      issuer: 'cryptofront',
      expiresIn: '1h',
    });
    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${sinProposito}`);
    expect(res.status).toBe(401);
  });

  it('un usuario desactivado pierde el acceso aunque su token siga vigente', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(401);
  });

  it('el refresco rota el token: el anterior deja de valer', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    const nuevo = await request(app).post('/api/auth/refrescar').send({ refreshToken: login.body.refreshToken });
    expect(nuevo.status).toBe(200);
    expect(nuevo.body.refreshToken).not.toBe(login.body.refreshToken);

    const reutilizado = await request(app).post('/api/auth/refrescar').send({ refreshToken: login.body.refreshToken });
    expect(reutilizado.status).toBe(401);
  });

  it('reutilizar un refresco revocado cierra todas las sesiones del usuario', async () => {
    const { usuario, password } = await crearUsuario();
    const sesionA = await iniciar(usuario.email, password);
    const sesionB = await iniciar(usuario.email, password);

    // Rotar A deja su token original revocado.
    await request(app).post('/api/auth/refrescar').send({ refreshToken: sesionA.body.refreshToken });
    // Alguien reutiliza el token viejo de A: se revoca todo, incluida la sesión B.
    const ataque = await request(app).post('/api/auth/refrescar').send({ refreshToken: sesionA.body.refreshToken });
    expect(ataque.status).toBe(401);

    const bRotada = await request(app).post('/api/auth/refrescar').send({ refreshToken: sesionB.body.refreshToken });
    expect(bRotada.status).toBe(401);
  });

  it('un refresco caducado no sirve', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    await prisma.sesionRefresco.updateMany({
      where: { usuarioId: usuario.id },
      data: { expiraEn: new Date(Date.now() - 1000) },
    });
    const res = await request(app).post('/api/auth/refrescar').send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(401);
  });

  it('salir revoca el refresco', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    const salida = await request(app).post('/api/auth/salir').send({ refreshToken: login.body.refreshToken });
    expect(salida.status).toBe(204);
    const res = await request(app).post('/api/auth/refrescar').send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(401);
  });

  it('el refresco no se guarda en claro en la base de datos', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await iniciar(usuario.email, password);
    const filas = await prisma.sesionRefresco.findMany({ where: { usuarioId: usuario.id } });
    expect(filas).toHaveLength(1);
    expect(filas[0].tokenHash).not.toBe(login.body.refreshToken);
    expect(filas[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
