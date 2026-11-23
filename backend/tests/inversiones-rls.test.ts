import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { conContextoRls, UsuarioContexto } from '../src/lib/contexto-rls';
import { crearEmpresa, crearUsuario, limpiarBD } from './helpers';

// Aislamiento de inversiones por RLS de Postgres (capa 2). Las pruebas usan el rol kira_app
// (sin BYPASSRLS): si las políticas fallan, estas pruebas fallan.
// Regla: un inversor solo ve y modifica sus propias posiciones, movimientos y valores,
// y nunca los de otro inversor ni de otra empresa.

async function escenario() {
  const empresaA = await crearEmpresa('Cryptofront A');
  const empresaB = await crearEmpresa('Empresa B');
  const dirA = (await crearUsuario({ tenantId: empresaA.id, rol: 'SUPERADMIN' })).usuario;
  const dirB = (await crearUsuario({ tenantId: empresaB.id, rol: 'SUPERADMIN' })).usuario;
  const inv1 = (await crearUsuario({ tenantId: empresaA.id, rol: 'INVERSOR' })).usuario;
  const inv2 = (await crearUsuario({ tenantId: empresaA.id, rol: 'INVERSOR' })).usuario;
  const inv3 = (await crearUsuario({ tenantId: empresaB.id, rol: 'INVERSOR' })).usuario;
  const usuarioSinRol = (await crearUsuario({ tenantId: empresaA.id, rol: 'USUARIO' })).usuario;

  const ctxDirA: UsuarioContexto = { id: dirA.id, tenantId: empresaA.id, rol: 'SUPERADMIN' };
  const ctxDirB: UsuarioContexto = { id: dirB.id, tenantId: empresaB.id, rol: 'SUPERADMIN' };

  const { pos1, pos2 } = await conContextoRls(ctxDirA, async (tx) => {
    const condiciones = await tx.condicionesInversion.create({
      data: { tenantId: empresaA.id, producto: 'BOT_TRADING', vigenteDesde: new Date('2026-01-01'), comisionExitoPct: 20 },
    });
    expect(condiciones.id).toBeTruthy();
    const p1 = await tx.posicionInversion.create({
      data: { tenantId: empresaA.id, inversorId: inv1.id, producto: 'BOT_TRADING', fechaAlta: new Date('2026-01-10'), capitalAportado: 1000 },
    });
    const p2 = await tx.posicionInversion.create({
      data: { tenantId: empresaA.id, inversorId: inv2.id, producto: 'PROYECTO_CRYPTO', fechaAlta: new Date('2026-02-10'), capitalAportado: 5000 },
    });
    for (const p of [p1, p2]) {
      await tx.movimientoInversion.create({
        data: { tenantId: empresaA.id, posicionId: p.id, inversorId: p.inversorId, tipo: 'APORTACION', importe: p.capitalAportado, fecha: p.fechaAlta, idOrigen: `ap-${p.id}` },
      });
      await tx.valorDiarioInversion.create({
        data: { tenantId: empresaA.id, posicionId: p.id, inversorId: p.inversorId, fecha: p.fechaAlta, valor: p.capitalAportado, idOrigen: `val-${p.id}` },
      });
    }
    return { pos1: p1, pos2: p2 };
  });

  const pos3Creada = await conContextoRls(ctxDirB, (tx) =>
    tx.posicionInversion.create({
      data: { tenantId: empresaB.id, inversorId: inv3.id, producto: 'TOKEN_SHARE', fechaAlta: new Date('2026-03-01'), capitalAportado: 300 },
    }),
  );

  return {
    empresaA, empresaB, ctxDirA, ctxDirB,
    inv1: { id: inv1.id, tenantId: empresaA.id, rol: 'INVERSOR' } as UsuarioContexto,
    inv2: { id: inv2.id, tenantId: empresaA.id, rol: 'INVERSOR' } as UsuarioContexto,
    inv3: { id: inv3.id, tenantId: empresaB.id, rol: 'INVERSOR' } as UsuarioContexto,
    sinRol: { id: usuarioSinRol.id, tenantId: empresaA.id, rol: 'USUARIO' } as UsuarioContexto,
    pos1, pos2, pos3: pos3Creada,
  };
}

describe('aislamiento de inversiones (RLS)', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  describe('inversor', () => {
    it('solo lista sus propias posiciones', async () => {
      const e = await escenario();
      const ids = await conContextoRls(e.inv1, (tx) => tx.posicionInversion.findMany({ select: { id: true } }));
      expect(ids.map((p) => p.id)).toEqual([e.pos1.id]);
    });

    it('no puede abrir por id la posición de otro inversor (ni de otra empresa)', async () => {
      const e = await escenario();
      const ajena = await conContextoRls(e.inv1, (tx) => tx.posicionInversion.findUnique({ where: { id: e.pos2.id } }));
      const deOtraEmpresa = await conContextoRls(e.inv1, (tx) => tx.posicionInversion.findUnique({ where: { id: e.pos3.id } }));
      expect(ajena).toBeNull();
      expect(deOtraEmpresa).toBeNull();
    });

    it('solo ve sus movimientos y valores', async () => {
      const e = await escenario();
      const movs = await conContextoRls(e.inv1, (tx) => tx.movimientoInversion.findMany());
      const vals = await conContextoRls(e.inv1, (tx) => tx.valorDiarioInversion.findMany());
      expect(movs.map((m) => m.posicionId)).toEqual([e.pos1.id]);
      expect(vals.map((v) => v.posicionId)).toEqual([e.pos1.id]);
    });

    it('no ve las condiciones de inversión, ni siquiera de su empresa', async () => {
      const e = await escenario();
      const condiciones = await conContextoRls(e.inv1, (tx) => tx.condicionesInversion.findMany());
      expect(condiciones).toEqual([]);
    });

    it('no puede crear una posición, ni para sí mismo', async () => {
      const e = await escenario();
      await expect(
        conContextoRls(e.inv1, (tx) =>
          tx.posicionInversion.create({
            data: { tenantId: e.empresaA.id, inversorId: e.inv1.id, producto: 'BOT_TRADING', fechaAlta: new Date(), capitalAportado: 1 },
          }),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it('no puede crear una posición a nombre de otro inversor', async () => {
      const e = await escenario();
      await expect(
        conContextoRls(e.inv1, (tx) =>
          tx.posicionInversion.create({
            data: { tenantId: e.empresaA.id, inversorId: e.inv2.id, producto: 'BOT_TRADING', fechaAlta: new Date(), capitalAportado: 1 },
          }),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it('no puede modificar ni reasignar su propia posición (no cambia nada)', async () => {
      const e = await escenario();
      const res = await conContextoRls(e.inv1, (tx) =>
        tx.posicionInversion.updateMany({ where: { id: e.pos1.id }, data: { capitalAportado: 999999 } }),
      );
      expect(res.count).toBe(0);
      const reasignada = await conContextoRls(e.inv1, (tx) =>
        tx.posicionInversion.updateMany({ where: { id: e.pos1.id }, data: { inversorId: e.inv2.id } }),
      );
      expect(reasignada.count).toBe(0);
      const intacta = await conContextoRls(e.ctxDirA, (tx) => tx.posicionInversion.findUniqueOrThrow({ where: { id: e.pos1.id } }));
      expect(Number(intacta.capitalAportado)).toBe(1000);
      expect(intacta.inversorId).toBe(e.inv1.id);
    });

    it('no puede borrar posiciones, ni la suya', async () => {
      const e = await escenario();
      const res = await conContextoRls(e.inv1, (tx) => tx.posicionInversion.deleteMany({ where: { id: e.pos1.id } }));
      expect(res.count).toBe(0);
      const sigue = await conContextoRls(e.ctxDirA, (tx) => tx.posicionInversion.count({ where: { id: e.pos1.id } }));
      expect(sigue).toBe(1);
    });

    it('no ve nada de otra empresa aunque tenga su propio id de inversor', async () => {
      const e = await escenario();
      const cruzado: UsuarioContexto = { id: e.inv1.id, tenantId: e.empresaB.id, rol: 'INVERSOR' };
      const posiciones = await conContextoRls(cruzado, (tx) => tx.posicionInversion.findMany());
      expect(posiciones).toEqual([]);
    });
  });

  describe('gestión de la empresa', () => {
    it('el director ve todas las posiciones de su empresa y ninguna de otra', async () => {
      const e = await escenario();
      const ids = await conContextoRls(e.ctxDirA, (tx) => tx.posicionInversion.findMany({ select: { id: true } }));
      expect(ids.map((p) => p.id).sort()).toEqual([e.pos1.id, e.pos2.id].sort());
      expect(ids.map((p) => p.id)).not.toContain(e.pos3.id);
    });

    it('el director de otra empresa no ve posiciones de la empresa A', async () => {
      const e = await escenario();
      const ids = await conContextoRls(e.ctxDirB, (tx) => tx.posicionInversion.findMany({ select: { id: true } }));
      expect(ids.map((p) => p.id)).toEqual([e.pos3.id]);
    });

    it('no puede crear una posición en otra empresa', async () => {
      const e = await escenario();
      await expect(
        conContextoRls(e.ctxDirA, (tx) =>
          tx.posicionInversion.create({
            data: { tenantId: e.empresaB.id, inversorId: e.inv3.id, producto: 'BOT_TRADING', fechaAlta: new Date(), capitalAportado: 1 },
          }),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it('no puede asociar un movimiento a una posición de otro inversor (clave compuesta)', async () => {
      const e = await escenario();
      await expect(
        conContextoRls(e.ctxDirA, (tx) =>
          tx.movimientoInversion.create({
            data: {
              tenantId: e.empresaA.id,
              posicionId: e.pos1.id,
              inversorId: e.inv2.id, // no es el dueño de pos1
              tipo: 'RETIRADA',
              importe: 10,
              fecha: new Date(),
              idOrigen: 'cruce-1',
            },
          }),
        ),
      ).rejects.toThrow();
    });

    it('la carga repetida con el mismo idOrigen no duplica movimientos', async () => {
      const e = await escenario();
      const datos = {
        tenantId: e.empresaA.id, posicionId: e.pos1.id, inversorId: e.inv1.id,
        tipo: 'RENDIMIENTO' as const, importe: 12.5, fecha: new Date('2026-04-01'), idOrigen: 'dia-2026-04-01',
      };
      await conContextoRls(e.ctxDirA, (tx) => tx.movimientoInversion.create({ data: datos }));
      await expect(conContextoRls(e.ctxDirA, (tx) => tx.movimientoInversion.create({ data: datos }))).rejects.toThrow();
    });

    it('la condición de inversión de la empresa A no es visible desde B', async () => {
      const e = await escenario();
      const vistas = await conContextoRls(e.ctxDirB, (tx) => tx.condicionesInversion.findMany());
      expect(vistas).toEqual([]);
    });
  });

  describe('sin contexto y sin rol de inversión', () => {
    it('una consulta sin contexto no devuelve nada (cierre por defecto)', async () => {
      await escenario();
      expect(await prisma.posicionInversion.count()).toBe(0);
      expect(await prisma.movimientoInversion.count()).toBe(0);
      expect(await prisma.valorDiarioInversion.count()).toBe(0);
      expect(await prisma.condicionesInversion.count()).toBe(0);
    });

    it('un usuario sin rol de inversión ni de gestión no ve posiciones', async () => {
      const e = await escenario();
      const posiciones = await conContextoRls(e.sinRol, (tx) => tx.posicionInversion.findMany());
      expect(posiciones).toEqual([]);
    });
  });
});
