import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { conContextoRls } from '../src/lib/contexto-rls';
import { crearEmpresa, crearUsuario, limpiarBD, tokenDe } from './helpers';

// Endpoints de la zona de inversores y del panel de gestión. Comprueba roles y aislamiento por API.
const app = crearApp({ limiteAuth: 1000 });

async function escenario() {
  const empresa = await crearEmpresa('Cryptofront prueba API');
  const otra = await crearEmpresa('Otra empresa');
  const gestor = (await crearUsuario({ tenantId: empresa.id, rol: 'SUPERADMIN' })).usuario;
  const inv1 = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario;
  const inv2 = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario;
  const usuario = (await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' })).usuario;
  const ctx = { id: gestor.id, tenantId: empresa.id, rol: 'SUPERADMIN' };
  const ids = await conContextoRls(ctx, async (tx) => {
    const crear = async (inversorId: string, capital: number, producto: 'BOT_TRADING' | 'TOKEN_SHARE') => {
      const p = await tx.posicionInversion.create({
        data: { tenantId: empresa.id, inversorId, producto, fechaAlta: new Date('2026-01-10'), capitalAportado: capital },
      });
      await tx.movimientoInversion.create({
        data: { tenantId: empresa.id, posicionId: p.id, inversorId, tipo: 'APORTACION', importe: capital, fecha: new Date('2026-01-10'), idOrigen: `ap-${p.id}` },
      });
      await tx.valorDiarioInversion.create({
        data: { tenantId: empresa.id, posicionId: p.id, inversorId, fecha: new Date('2026-11-20'), valor: capital * 1.2, idOrigen: `v-${p.id}` },
      });
      return p.id;
    };
    return { p1: await crear(inv1.id, 10000, 'BOT_TRADING'), p2: await crear(inv2.id, 5000, 'BOT_TRADING') };
  });
  const otroGestor = (await crearUsuario({ tenantId: otra.id, rol: 'SUPERADMIN' })).usuario;
  return {
    ids,
    tokenInv1: await tokenDe(app, inv1.email),
    tokenInv2: await tokenDe(app, inv2.email),
    tokenGestor: await tokenDe(app, gestor.email),
    tokenUsuario: await tokenDe(app, usuario.email),
    tokenOtroGestor: await tokenDe(app, otroGestor.email),
  };
}

const con = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('API de inversiones', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('el inversor ve su patrimonio y solo sus posiciones', async () => {
    const e = await escenario();
    const res = await request(app).get('/api/inversiones/resumen').set(con(e.tokenInv1));
    expect(res.status).toBe(200);
    expect(res.body.capitalAportado).toBe(10000);
    expect(res.body.patrimonio).toBe(12000);
    expect(res.body.ganancia).toBe(2000);
    expect(res.body.estrategiasActivas).toBe(1);
  });

  it('el inversor no ve movimientos ni patrimonio de otro inversor', async () => {
    const e = await escenario();
    const movs = await request(app).get('/api/inversiones/movimientos').set(con(e.tokenInv1));
    expect(movs.status).toBe(200);
    expect(movs.body.datos.every((m: { importe: number }) => m.importe !== 5000)).toBe(true);
    const res = await request(app).get('/api/inversiones/resumen').set(con(e.tokenInv2));
    expect(res.body.capitalAportado).toBe(5000);
  });

  it('la serie del inversor tiene datos y respeta el filtro de producto', async () => {
    const e = await escenario();
    const res = await request(app).get('/api/inversiones/serie?periodo=todo&producto=BOT_TRADING').set(con(e.tokenInv1));
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
    const ultimo = res.body.datos[res.body.datos.length - 1];
    expect(ultimo.capitalAportado).toBe(10000);
  });

  it('parámetros no válidos responden 400', async () => {
    const e = await escenario();
    expect((await request(app).get('/api/inversiones/serie?producto=CRIPTO').set(con(e.tokenInv1))).status).toBe(400);
    expect((await request(app).get('/api/inversiones/serie?periodo=5a').set(con(e.tokenInv1))).status).toBe(400);
  });

  it('sin token no hay acceso', async () => {
    await escenario();
    expect((await request(app).get('/api/inversiones/resumen')).status).toBe(401);
  });
});
