import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { diferencias, sanear } from '../src/lib/auditoria';
import { PASSWORD_PRUEBA, crearEmpresa, crearUsuario, emailUnico, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

async function directorDe(tenantId: string) {
  const { usuario } = await crearUsuario({ tenantId, rol: 'SUPERADMIN' });
  return { usuario, token: await tokenDe(app, usuario.email) };
}

describe('auditoría', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  describe('saneado de datos', () => {
    it('sanear elimina contraseñas, hashes, tokens y secretos 2FA', () => {
      const limpio = sanear({
        nombre: 'Ana',
        passwordHash: 'x',
        twoFactorSecretoCifrado: 'x',
        token: 'x',
        valorCifrado: 'x',
      });
      expect(limpio).toEqual({ nombre: 'Ana' });
    });

    it('diferencias solo incluye campos cambiados y nunca sensibles', () => {
      const d = diferencias(
        { nombre: 'A', activo: true, passwordHash: 'h1' },
        { nombre: 'B', activo: true, passwordHash: 'h2' },
      );
      expect(d).toEqual({ nombre: { antes: 'A', despues: 'B' } });
    });
  });

  it('crear una sucursal deja un registro CREAR en la misma empresa', async () => {
    const empresa = await crearEmpresa();
    const { usuario, token } = await directorDe(empresa.id);
    const res = await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'Norte' });
    expect(res.status).toBe(201);
    const registros = await prisma.registroAuditoria.findMany({ where: { tenantId: empresa.id, entidad: 'Sucursal' } });
    expect(registros).toHaveLength(1);
    expect(registros[0].accion).toBe('CREAR');
    expect(registros[0].actorId).toBe(usuario.id);
  });

  it('editar un usuario registra solo la diferencia', async () => {
    const empresa = await crearEmpresa();
    const { token } = await directorDe(empresa.id);
    const { usuario: objetivo } = await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' });
    await request(app).patch(`/api/organizacion/usuarios/${objetivo.id}`).set('Authorization', `Bearer ${token}`).send({ nombre: 'Nombre nuevo' });
    const reg = await prisma.registroAuditoria.findFirstOrThrow({
      where: { tenantId: empresa.id, entidad: 'Usuario', entidadId: objetivo.id, accion: 'EDITAR' },
    });
    expect(Object.keys(reg.cambios as object)).toEqual(['nombre']);
  });

  it('la auditoría nunca guarda hashes de contraseña', async () => {
    const empresa = await crearEmpresa();
    const { token } = await directorDe(empresa.id);
    await request(app)
      .post('/api/organizacion/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Nuevo', email: emailUnico('aud'), password: PASSWORD_PRUEBA, rol: 'INVERSOR' });
    const registros = await prisma.registroAuditoria.findMany({ where: { tenantId: empresa.id } });
    expect(JSON.stringify(registros)).not.toContain('scrypt$');
    expect(JSON.stringify(registros)).not.toContain('passwordHash');
  });

  it('un login fallido deja un evento de seguridad', async () => {
    const empresa = await crearEmpresa();
    const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' });
    await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'mala-clave' });
    const eventos = await prisma.registroAuditoria.findMany({ where: { tenantId: empresa.id, accion: 'EVENTO' } });
    expect(eventos.map((e) => (e.cambios as { evento: string }).evento)).toContain('FALLO_AUTENTICACION');
  });

  it('cinco fallos dejan además el evento de bloqueo', async () => {
    const empresa = await crearEmpresa();
    const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' });
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: usuario.email, password: 'mala-clave' });
    }
    const eventos = await prisma.registroAuditoria.findMany({ where: { tenantId: empresa.id, accion: 'EVENTO' } });
    expect(eventos.map((e) => (e.cambios as { evento: string }).evento)).toContain('CUENTA_BLOQUEADA');
  });

  it('el director ve la auditoría de su empresa; el coordinador no', async () => {
    const empresa = await crearEmpresa();
    const { token } = await directorDe(empresa.id);
    await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'Sur' });
    const ok = await request(app).get('/api/organizacion/auditoria').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.datos.length).toBeGreaterThan(0);

    const { usuario: coord } = await crearUsuario({ tenantId: empresa.id, rol: 'INVERSOR' });
    const tokenCoord = await tokenDe(app, coord.email);
    const denegado = await request(app).get('/api/organizacion/auditoria').set('Authorization', `Bearer ${tokenCoord}`);
    expect(denegado.status).toBe(403);
  });

  it('la auditoría de una empresa no incluye la de otra', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const dirA = await directorDe(a.id);
    const dirB = await directorDe(b.id);
    await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${dirB.token}`).send({ nombre: 'Solo B' });
    const res = await request(app).get('/api/organizacion/auditoria').set('Authorization', `Bearer ${dirA.token}`);
    const idsB = (await prisma.registroAuditoria.findMany({ where: { tenantId: b.id } })).map((r) => r.id);
    const idsVistos = res.body.datos.map((r: { id: string }) => r.id);
    expect(idsVistos.filter((id: string) => idsB.includes(id))).toEqual([]);
  });

  it('la aplicación no puede modificar ni borrar registros de auditoría (inmutable)', async () => {
    const empresa = await crearEmpresa();
    const { token } = await directorDe(empresa.id);
    await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'Inmutable' });
    await expect(
      prisma.$executeRaw`UPDATE "RegistroAuditoria" SET "accion" = 'X' WHERE "tenantId" = ${empresa.id}`,
    ).rejects.toThrow(/permission denied|permiso/i);
    await expect(
      prisma.$executeRaw`DELETE FROM "RegistroAuditoria" WHERE "tenantId" = ${empresa.id}`,
    ).rejects.toThrow(/permission denied|permiso/i);
  });
});
