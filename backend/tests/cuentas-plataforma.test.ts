import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { generarClaveTemporal, validarClaveNueva } from '../src/lib/claves';
import { crearEmpresa, crearPlataforma, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

describe('claves temporales y política', () => {
  it('genera claves de 12 caracteres sin ambigüedades y distintas entre sí', () => {
    const a = generarClaveTemporal();
    const b = generarClaveTemporal();
    expect(a).toHaveLength(12);
    expect(a).toMatch(/^[abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    expect(a).not.toBe(b);
  });

  it('rechaza claves cortas y la misma clave actual', () => {
    expect(() => validarClaveNueva('corta')).toThrow(/al menos 12/);
    expect(() => validarClaveNueva('MismaClave123', 'MismaClave123')).toThrow(/distinta/);
    expect(() => validarClaveNueva('OtraClaveSegura1')).not.toThrow();
  });
});

describe('cuentas gestionadas por la plataforma', () => {
  let superToken: string;
  let superId: string;
  let empresaId: string;

  beforeEach(async () => {
    await limpiarBD();
    const { usuario, password } = await crearPlataforma();
    superId = usuario.id;
    superToken = await tokenDe(app, usuario.email, password);
    empresaId = (await crearEmpresa()).id;
  });

  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('alta con clave temporal: la cuenta debe cambiarla antes de usar la zona', async () => {
    const alta = await request(app).post('/api/plataforma/usuarios').set('Authorization', `Bearer ${superToken}`)
      .send({ email: 'nuevo@ejemplo.test', nombre: 'Nuevo Inversor', rol: 'INVERSOR', tenantId: empresaId });
    expect(alta.status).toBe(201);
    const clave = alta.body.claveTemporal as string;
    expect(clave).toHaveLength(12);

    const login = await request(app).post('/api/auth/login').send({ email: 'nuevo@ejemplo.test', password: clave });
    expect(login.status).toBe(200);
    expect(login.body.usuario.debeCambiarPassword).toBe(true);
    const token = login.body.accessToken as string;

    const bloqueada = await request(app).get('/api/inversiones/resumen').set('Authorization', `Bearer ${token}`);
    expect(bloqueada.status).toBe(403);

    const cambio = await request(app).post('/api/auth/cambiar-password').set('Authorization', `Bearer ${token}`)
      .send({ actual: clave, nueva: 'ClaveDefinitiva2026' });
    expect(cambio.status).toBe(200);
    expect(cambio.body.usuario.debeCambiarPassword).toBe(false);

    // La sesión anterior queda cerrada; la nueva funciona.
    const antigua = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${token}`);
    expect(antigua.status).toBe(200);
    const nueva = await request(app).post('/api/auth/login').send({ email: 'nuevo@ejemplo.test', password: 'ClaveDefinitiva2026' });
    expect(nueva.status).toBe(200);
    expect(nueva.body.usuario.debeCambiarPassword).toBe(false);
  });

  it('restablecer la clave invalida la anterior y obliga a cambiarla', async () => {
    const alta = await request(app).post('/api/plataforma/usuarios').set('Authorization', `Bearer ${superToken}`)
      .send({ email: 'repetido@ejemplo.test', nombre: 'Cliente Demo', rol: 'INVERSOR', tenantId: empresaId });
    const claveAntigua = alta.body.claveTemporal as string;
    const reset = await request(app).post(`/api/plataforma/usuarios/${alta.body.usuario.id}/restablecer-clave`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(reset.status).toBe(200);
    expect(reset.body.claveTemporal).not.toBe(claveAntigua);

    const conAntigua = await request(app).post('/api/auth/login').send({ email: 'repetido@ejemplo.test', password: claveAntigua });
    expect(conAntigua.status).toBe(401);
    const conNueva = await request(app).post('/api/auth/login').send({ email: 'repetido@ejemplo.test', password: reset.body.claveTemporal });
    expect(conNueva.body.usuario.debeCambiarPassword).toBe(true);
  });

  it('no se puede desactivar la propia cuenta', async () => {
    const res = await request(app).patch(`/api/plataforma/usuarios/${superId}`).set('Authorization', `Bearer ${superToken}`)
      .send({ activo: false });
    expect(res.status).toBe(400);
  });

  it('solo SUPERADMIN gestiona cuentas', async () => {
    const { usuario, password } = await crearUsuario({ tenantId: empresaId, rol: 'DIRECTOR_EMPRESA' });
    const token = await tokenDe(app, usuario.email, password);
    const res = await request(app).get('/api/plataforma/usuarios').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('exporta la auditoría a Excel y la exportación queda registrada', async () => {
    const res = await request(app).get('/api/plataforma/auditoria/excel').set('Authorization', `Bearer ${superToken}`)
      .buffer(true).parse((r, cb) => { const d: Buffer[] = []; r.on('data', (c: Buffer) => d.push(c)); r.on('end', () => cb(null, Buffer.concat(d))); });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    const registro = await prisma.registroAuditoria.findFirst({ where: { entidad: 'Auditoria' }, orderBy: { creadoEn: 'desc' } });
    expect(registro?.actorId).toBe(superId);
  });

  it('las altas quedan en la auditoría', async () => {
    await request(app).post('/api/plataforma/usuarios').set('Authorization', `Bearer ${superToken}`)
      .send({ email: 'auditado@ejemplo.test', nombre: 'Auditado Demo', rol: 'INVERSOR', tenantId: empresaId });
    const res = await request(app).get('/api/plataforma/auditoria?entidad=Usuario').set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    const alta = res.body.registros.find((r: { accion: string; cambios: { email?: string } }) => r.accion === 'CREAR' && r.cambios?.email === 'auditado@ejemplo.test');
    expect(alta).toBeTruthy();
    expect(alta.actor.id).toBe(superId);
    expect(JSON.stringify(alta.cambios)).not.toMatch(/passwordHash|clave/i);
  });
});

describe('sesiones tras cambiar la contraseña', () => {
  it('un token emitido antes del cambio deja de valer', async () => {
    await limpiarBD();
    const { usuario, password } = await crearUsuario({ tenantId: (await crearEmpresa()).id, rol: 'INVERSOR' });
    const antiguo = await tokenDe(app, usuario.email, password);
    await new Promise((r) => setTimeout(r, 1100));
    const cambio = await request(app).post('/api/auth/cambiar-password').set('Authorization', `Bearer ${antiguo}`)
      .send({ actual: password, nueva: 'OtraClaveSegura2026' });
    expect(cambio.status).toBe(200);
    const sinValor = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${antiguo}`);
    expect(sinValor.status).toBe(401);
    const nuevo = cambio.body.accessToken as string;
    const conNuevo = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${nuevo}`);
    expect(conNuevo.status).toBe(200);
  });
});
