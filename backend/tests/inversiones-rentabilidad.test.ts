import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { conContextoRls } from '../src/lib/contexto-rls';
import { crearEmpresa, crearPlataforma, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });
const con = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('rentabilidad mensual y cargas', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('calcula la rentabilidad mensual y acumulada con un caso comprobable a mano', async () => {
    const empresa = await crearEmpresa('Rentabilidad');
    const gestor = (await crearUsuario({ tenantId: empresa.id, rol: 'SUPERADMIN' })).usuario;
    const inv = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario;
    const ctx = { id: gestor.id, tenantId: empresa.id, rol: 'SUPERADMIN' };
    await conContextoRls(ctx, async (tx) => {
      const p = await tx.posicionInversion.create({
        data: { tenantId: empresa.id, inversorId: inv.id, producto: 'BOT_TRADING', fechaAlta: new Date('2026-01-10'), capitalAportado: 1000 },
      });
      await tx.movimientoInversion.create({
        data: { tenantId: empresa.id, posicionId: p.id, inversorId: inv.id, tipo: 'APORTACION', importe: 1000, fecha: new Date('2026-01-10'), idOrigen: 'ap-r' },
      });
      await tx.valorDiarioInversion.createMany({
        data: [
          { tenantId: empresa.id, posicionId: p.id, inversorId: inv.id, fecha: new Date('2026-01-31'), valor: 1100, idOrigen: 'v-ene' },
          { tenantId: empresa.id, posicionId: p.id, inversorId: inv.id, fecha: new Date('2026-02-28'), valor: 1210, idOrigen: 'v-feb' },
        ],
      });
    });
    const t = await tokenDe(app, inv.email);
    const res = await request(app).get('/api/inversiones/rentabilidad').set(con(t));
    expect(res.status).toBe(200);
    expect(res.body.meses[0]).toMatchObject({ mes: '2026-01', rentabilidadPct: 10, acumuladaPct: 10 });
    expect(res.body.meses[1]).toMatchObject({ mes: '2026-02', rentabilidadPct: 10, acumuladaPct: 21 });
    expect(res.body.ultimaCarga).toBeNull();
  });

  it('la última carga correcta aparece con su próxima prevista semanal', async () => {
    const empresa = await crearEmpresa('Cargas');
    const inv = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario;
    await prisma.cargaInversion.create({
      data: { tenantId: empresa.id, fechaCarga: new Date('2026-11-16T00:30:00Z'), origen: 'prueba', estado: 'OK', filasRecibidas: 10, filasAceptadas: 10 },
    });
    await prisma.cargaInversion.create({
      data: { tenantId: empresa.id, fechaCarga: new Date('2026-11-20T00:30:00Z'), origen: 'prueba', estado: 'ERROR', filasRecibidas: 10, filasAceptadas: 0, erroresResumen: 'Fichero incompleto' },
    });
    const t = await tokenDe(app, inv.email);
    const res = await request(app).get('/api/inversiones/rentabilidad').set(con(t));
    expect(new Date(res.body.ultimaCarga).toISOString()).toBe('2026-11-16T00:30:00.000Z');
    expect(new Date(res.body.proximaCarga).toISOString()).toBe('2026-11-23T00:30:00.000Z');
  });

  it('la tabla de cargas es solo para SUPERADMIN', async () => {
    const plat = await crearPlataforma();
    const tokenSA = await tokenDe(app, plat.usuario.email);
    const empresa = await crearEmpresa('Cargas tabla');
    const dir = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario;
    await prisma.cargaInversion.create({
      data: { tenantId: empresa.id, fechaCarga: new Date('2026-11-16T00:30:00Z'), origen: 'prueba', estado: 'OK', filasRecibidas: 5, filasAceptadas: 5 },
    });
    const ok = await request(app).get('/api/plataforma/cargas').set(con(tokenSA));
    expect(ok.status).toBe(200);
    expect(ok.body.cargas[0].tenant.nombre).toBe('Cargas tabla');
    const tokenDir = await tokenDe(app, dir.email);
    expect((await request(app).get('/api/plataforma/cargas').set(con(tokenDir))).status).toBe(403);
  });
});
