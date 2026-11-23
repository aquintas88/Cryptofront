import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { crearEmpresa, crearUsuario, limpiarBD, tokenDe } from './helpers';

// Pruebas de aislamiento entre empresas (decisión D-06). Cada empresa tiene su director y sus datos.
// Un recurso de otra empresa debe comportarse como si no existiera.
const app = crearApp({ limiteAuth: 1000 });

async function escenario() {
  const empresaA = await crearEmpresa('Empresa A');
  const empresaB = await crearEmpresa('Empresa B');
  const dirA = await crearUsuario({ tenantId: empresaA.id, rol: 'SUPERADMIN' });
  const dirB = await crearUsuario({ tenantId: empresaB.id, rol: 'SUPERADMIN' });
  const usrB = await crearUsuario({ tenantId: empresaB.id, rol: 'INVERSOR' });
  const sucursalB = await prisma.sucursal.create({ data: { tenantId: empresaB.id, nombre: 'Sede B' } });
  return {
    empresaA,
    empresaB,
    tokenA: await tokenDe(app, dirA.usuario.email),
    tokenB: await tokenDe(app, dirB.usuario.email),
    tokenUsrB: await tokenDe(app, usrB.usuario.email),
    usrB: usrB.usuario,
    sucursalB,
  };
}

describe('aislamiento entre empresas', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('cada director solo ve las sucursales de su empresa', async () => {
    const e = await escenario();
    const res = await request(app).get('/api/organizacion/sucursales').set('Authorization', `Bearer ${e.tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual([]);
  });

  it('cada director solo ve los usuarios de su empresa', async () => {
    const e = await escenario();
    const res = await request(app).get('/api/organizacion/usuarios').set('Authorization', `Bearer ${e.tokenA}`);
    const ids = res.body.datos.map((u: { id: string }) => u.id);
    expect(ids).not.toContain(e.usrB.id);
  });

  it('no se puede modificar una sucursal de otra empresa (responde 404)', async () => {
    const e = await escenario();
    const res = await request(app)
      .patch(`/api/organizacion/sucursales/${e.sucursalB.id}`)
      .set('Authorization', `Bearer ${e.tokenA}`)
      .send({ activa: false });
    expect(res.status).toBe(404);
    const intacta = await prisma.sucursal.findUniqueOrThrow({ where: { id: e.sucursalB.id } });
    expect(intacta.activa).toBe(true);
  });

  it('no se puede modificar un usuario de otra empresa (responde 404)', async () => {
    const e = await escenario();
    const res = await request(app)
      .patch(`/api/organizacion/usuarios/${e.usrB.id}`)
      .set('Authorization', `Bearer ${e.tokenA}`)
      .send({ activo: false });
    expect(res.status).toBe(404);
    const intacto = await prisma.usuario.findUniqueOrThrow({ where: { id: e.usrB.id } });
    expect(intacto.activo).toBe(true);
  });

  it('no se puede asignar a un usuario una sucursal de otra empresa', async () => {
    const e = await escenario();
    const propio = await crearUsuario({ tenantId: e.empresaA.id, rol: 'INVERSOR' });
    const res = await request(app)
      .patch(`/api/organizacion/usuarios/${propio.usuario.id}`)
      .set('Authorization', `Bearer ${e.tokenA}`)
      .send({ sucursalId: e.sucursalB.id });
    expect(res.status).toBe(400);
    const sinCambio = await prisma.usuario.findUniqueOrThrow({ where: { id: propio.usuario.id } });
    expect(sinCambio.sucursalId).toBeNull();
  });

  it('no se puede crear un usuario con una sucursal de otra empresa', async () => {
    const e = await escenario();
    const res = await request(app)
      .post('/api/organizacion/usuarios')
      .set('Authorization', `Bearer ${e.tokenA}`)
      .send({
        nombre: 'Nuevo',
        email: 'cruce@ejemplo.test',
        password: 'contraseña-ficticia-larga-1',
        rol: 'INVERSOR',
        sucursalId: e.sucursalB.id,
      });
    expect(res.status).toBe(400);
  });

  it('el superadmin de la empresa B no ve las sucursales de la empresa A', async () => {
    const e = await escenario();
    const sucursalA = await prisma.sucursal.create({ data: { tenantId: e.empresaA.id, nombre: 'Sede A' } });
    const res = await request(app).get('/api/organizacion/sucursales').set('Authorization', `Bearer ${e.tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((s: { id: string }) => s.id)).not.toContain(sucursalA.id);
  });

  it('un token de empresa no abre rutas de plataforma', async () => {
    const e = await escenario();
    const usuarioA = await crearUsuario({ tenantId: e.empresaA.id, rol: 'INVERSOR' });
    const tokenUsuarioA = await tokenDe(app, usuarioA.usuario.email);
    const res = await request(app).get('/api/plataforma/empresas').set('Authorization', `Bearer ${tokenUsuarioA}`);
    expect(res.status).toBe(403);
  });
});
