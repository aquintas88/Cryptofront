import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { leerParamsListado, ordenPrisma } from '../src/lib/listados';
import { crearEmpresa, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

async function directorDe(tenantId: string) {
  const { usuario } = await crearUsuario({ tenantId, rol: 'SUPERADMIN' });
  return tokenDe(app, usuario.email);
}

describe('listados estándar', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('pagina: devuelve total, página y tamaño, y corta el resultado', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    for (const nombre of ['Alfa', 'Beta', 'Gamma']) {
      await prisma.sucursal.create({ data: { tenantId: empresa.id, nombre } });
    }
    const res = await request(app).get('/api/organizacion/sucursales?tamano=2&pagina=2').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.pagina).toBe(2);
    expect(res.body.datos.map((s: { nombre: string }) => s.nombre)).toEqual(['Gamma']);
  });

  it('ordena por campos permitidos y en sentido descendente', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    for (const nombre of ['Alfa', 'Beta']) await prisma.sucursal.create({ data: { tenantId: empresa.id, nombre } });
    const res = await request(app).get('/api/organizacion/sucursales?orden=nombre&direccion=desc').set('Authorization', `Bearer ${token}`);
    expect(res.body.datos.map((s: { nombre: string }) => s.nombre)).toEqual(['Beta', 'Alfa']);
  });

  it('rechaza un orden fuera de la lista blanca (protección frente a inyección en el orden)', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const res = await request(app)
      .get('/api/organizacion/sucursales?orden=nombre;DROP%20TABLE')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('limita el tamaño de página a 100', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const res = await request(app).get('/api/organizacion/sucursales?tamano=500').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('desempata por id: el orden es estable entre peticiones', async () => {
    const params = leerParamsListado({ orden: 'nombre' }, ['nombre', 'id'] as const, 'nombre');
    expect(ordenPrisma(params)).toEqual([{ nombre: 'asc' }, { id: 'asc' }]);
  });

  it('rechaza página o dirección no válidas', () => {
    expect(() => leerParamsListado({ pagina: '0' }, ['nombre'] as const, 'nombre')).toThrow();
    expect(() => leerParamsListado({ direccion: 'arriba' }, ['nombre'] as const, 'nombre')).toThrow();
  });
});

describe('fichas', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('la ficha de usuario incluye su sucursal y ningún dato sensible', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const suc = await prisma.sucursal.create({ data: { tenantId: empresa.id, nombre: 'Centro' } });
    const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR', sucursalId: suc.id });
    const res = await request(app).get(`/api/organizacion/usuarios/${usuario.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.usuario.sucursal.nombre).toBe('Centro');
    const texto = JSON.stringify(res.body);
    expect(texto).not.toContain('passwordHash');
    expect(texto).not.toContain('twoFactor');
  });

  it('la ficha de una sucursal de otra empresa responde 404', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const sucB = await prisma.sucursal.create({ data: { tenantId: b.id, nombre: 'Ajena' } });
    const tokenA = await directorDe(a.id);
    const res = await request(app).get(`/api/organizacion/sucursales/${sucB.id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it('la ficha de un usuario de otra empresa responde 404', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const { usuario: ajeno } = await crearUsuario({ tenantId: b.id, rol: 'INVERSOR' });
    const tokenA = await directorDe(a.id);
    const res = await request(app).get(`/api/organizacion/usuarios/${ajeno.id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});
