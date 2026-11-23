import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { crearEmpresa, crearPlataforma, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

describe('panel de inversiones de la plataforma', () => {
  let superToken: string;
  let empresaId: string;
  let inversorId: string;

  beforeEach(async () => {
    await limpiarBD();
    const { usuario, password } = await crearPlataforma();
    superToken = await tokenDe(app, usuario.email, password);
    const empresa = await crearEmpresa('Empresa panel');
    empresaId = empresa.id;
    inversorId = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario.id;
  });

  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('lista los inversores de la empresa', async () => {
    const res = await request(app).get(`/api/plataforma/panel/inversores?empresa=${empresaId}`).set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.inversores.map((i: { id: string }) => i.id)).toContain(inversorId);
  });

  it('el acumulado responde sin inversor y el filtro por inversor responde con él', async () => {
    const acumulado = await request(app).get(`/api/plataforma/panel/resumen?empresa=${empresaId}`).set('Authorization', `Bearer ${superToken}`);
    expect(acumulado.status).toBe(200);
    const deUno = await request(app).get(`/api/plataforma/panel/resumen?empresa=${empresaId}&inversor=${inversorId}`).set('Authorization', `Bearer ${superToken}`);
    expect(deUno.status).toBe(200);
    const serie = await request(app).get(`/api/plataforma/panel/serie?empresa=${empresaId}&periodo=1a`).set('Authorization', `Bearer ${superToken}`);
    expect(serie.status).toBe(200);
  });

  it('un inversor de otra empresa no se puede filtrar en esta', async () => {
    const otra = await crearEmpresa('Otra');
    const ajeno = (await crearUsuario({ tenantId: otra.id, rol: 'INVERSOR' })).usuario.id;
    const res = await request(app).get(`/api/plataforma/panel/resumen?empresa=${empresaId}&inversor=${ajeno}`).set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(400);
  });

  it('un inversor no accede al panel de plataforma', async () => {
    const { usuario, password } = await crearUsuario({ tenantId: empresaId, rol: 'INVERSOR' });
    const token = await tokenDe(app, usuario.email, password);
    const res = await request(app).get(`/api/plataforma/panel/resumen?empresa=${empresaId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
