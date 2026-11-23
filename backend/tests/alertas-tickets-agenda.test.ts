import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { crearAlerta } from '../src/services/alertas.service';
import { crearEmpresa, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

async function sesion(rol: 'SUPERADMIN' | 'INVERSOR', tenantId: string) {
  const { usuario } = await crearUsuario({ tenantId, rol });
  return { usuario, token: await tokenDe(app, usuario.email) };
}

describe('alertas', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('cada usuario ve sus alertas y las de la empresa; el director ve todas', async () => {
    const empresa = await crearEmpresa();
    const yo = await sesion('INVERSOR', empresa.id);
    const otro = await sesion('INVERSOR', empresa.id);
    const dir = await sesion('SUPERADMIN', empresa.id);
    await crearAlerta(empresa.id, { tipo: 'PARA_MI', mensaje: 'x', destinatarioId: yo.usuario.id });
    await crearAlerta(empresa.id, { tipo: 'PARA_OTRO', mensaje: 'x', destinatarioId: otro.usuario.id });
    await crearAlerta(empresa.id, { tipo: 'EMPRESA', mensaje: 'x', destinatarioId: null });

    const miasRes = await request(app).get('/api/alertas').set('Authorization', `Bearer ${yo.token}`);
    expect(miasRes.body.datos.map((a: { tipo: string }) => a.tipo).sort()).toEqual(['EMPRESA', 'PARA_MI']);
    const dirRes = await request(app).get('/api/alertas').set('Authorization', `Bearer ${dir.token}`);
    expect(dirRes.body.total).toBe(3);
  });

  it('resolver una alerta ajena responde 404 para quien no es destinatario', async () => {
    const empresa = await crearEmpresa();
    const otro = await sesion('INVERSOR', empresa.id);
    const yo = await sesion('INVERSOR', empresa.id);
    const alerta = await crearAlerta(empresa.id, { tipo: 'AJENA', mensaje: 'x', destinatarioId: otro.usuario.id });
    const res = await request(app).post(`/api/alertas/${alerta.id}/resolver`).set('Authorization', `Bearer ${yo.token}`);
    expect(res.status).toBe(404);
  });

  it('el destinatario resuelve su alerta y queda registrado', async () => {
    const empresa = await crearEmpresa();
    const yo = await sesion('INVERSOR', empresa.id);
    const alerta = await crearAlerta(empresa.id, { tipo: 'MIA', mensaje: 'x', destinatarioId: yo.usuario.id });
    const res = await request(app).post(`/api/alertas/${alerta.id}/resolver`).set('Authorization', `Bearer ${yo.token}`);
    expect(res.status).toBe(200);
    expect(res.body.alerta.estado).toBe('RESUELTA');
    expect(await prisma.registroAuditoria.count({ where: { tenantId: empresa.id, entidad: 'Alerta' } })).toBe(1);
  });

  it('no se puede asignar una alerta a un usuario de otra empresa', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const ajeno = await sesion('INVERSOR', b.id);
    await expect(crearAlerta(a.id, { tipo: 'X', mensaje: 'x', destinatarioId: ajeno.usuario.id })).rejects.toThrow();
  });
});

describe('tickets', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('cualquier usuario crea un ticket y queda con su historial inicial', async () => {
    const empresa = await crearEmpresa();
    const yo = await sesion('INVERSOR', empresa.id);
    const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${yo.token}`)
      .send({ asunto: 'No abre', descripcion: 'La pantalla queda en blanco.', criticidad: 'ALTA' });
    expect(res.status).toBe(201);
    const detalle = await request(app).get(`/api/tickets/${res.body.ticket.id}`).set('Authorization', `Bearer ${yo.token}`);
    expect(detalle.body.ticket.historial[0].cambio).toBe('Ticket creado');
  });

  it('cada usuario ve solo sus tickets; el director ve todos', async () => {
    const empresa = await crearEmpresa();
    const a = await sesion('INVERSOR', empresa.id);
    const b = await sesion('INVERSOR', empresa.id);
    const dir = await sesion('SUPERADMIN', empresa.id);
    for (const s of [a, b]) {
      await request(app).post('/api/tickets').set('Authorization', `Bearer ${s.token}`).send({ asunto: 'T', descripcion: 'D' });
    }
    expect((await request(app).get('/api/tickets').set('Authorization', `Bearer ${a.token}`)).body.total).toBe(1);
    expect((await request(app).get('/api/tickets').set('Authorization', `Bearer ${dir.token}`)).body.total).toBe(2);
  });

  it('un usuario no puede ver ni comentar el ticket de otro (404)', async () => {
    const empresa = await crearEmpresa();
    const a = await sesion('INVERSOR', empresa.id);
    const b = await sesion('INVERSOR', empresa.id);
    const t = await request(app).post('/api/tickets').set('Authorization', `Bearer ${a.token}`).send({ asunto: 'T', descripcion: 'D' });
    const ver = await request(app).get(`/api/tickets/${t.body.ticket.id}`).set('Authorization', `Bearer ${b.token}`);
    const comenta = await request(app).post(`/api/tickets/${t.body.ticket.id}/comentarios`).set('Authorization', `Bearer ${b.token}`).send({ texto: 'hola' });
    expect(ver.status).toBe(404);
    expect(comenta.status).toBe(404);
  });

  it('solo el director cambia estado y cada cambio queda en el historial', async () => {
    const empresa = await crearEmpresa();
    const a = await sesion('INVERSOR', empresa.id);
    const dir = await sesion('SUPERADMIN', empresa.id);
    const t = await request(app).post('/api/tickets').set('Authorization', `Bearer ${a.token}`).send({ asunto: 'T', descripcion: 'D' });
    const denegado = await request(app).patch(`/api/tickets/${t.body.ticket.id}`).set('Authorization', `Bearer ${a.token}`).send({ estado: 'CERRADO' });
    expect(denegado.status).toBe(403);
    const ok = await request(app).patch(`/api/tickets/${t.body.ticket.id}`).set('Authorization', `Bearer ${dir.token}`).send({ estado: 'EN_CURSO' });
    expect(ok.status).toBe(200);
    const detalle = await request(app).get(`/api/tickets/${t.body.ticket.id}`).set('Authorization', `Bearer ${dir.token}`);
    expect(detalle.body.ticket.historial.map((h: { cambio: string }) => h.cambio)).toContain('Estado: ABIERTO → EN_CURSO');
  });

  it('valida el estado y la criticidad', async () => {
    const empresa = await crearEmpresa();
    const a = await sesion('INVERSOR', empresa.id);
    const res = await request(app).post('/api/tickets').set('Authorization', `Bearer ${a.token}`)
      .send({ asunto: 'T', descripcion: 'D', criticidad: 'CRITICA_NO_EXISTE' });
    expect(res.status).toBe(400);
  });
});

describe('agenda', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  const evento = { titulo: 'Reunión', inicio: '2026-12-01T10:00:00+01:00', fin: '2026-12-01T11:00:00+01:00' };

  it('rechaza fechas sin zona horaria', async () => {
    const empresa = await crearEmpresa();
    const dir = await sesion('SUPERADMIN', empresa.id);
    const res = await request(app).post('/api/agenda').set('Authorization', `Bearer ${dir.token}`)
      .send({ ...evento, inicio: '2026-12-01T10:00:00' });
    expect(res.status).toBe(400);
  });

  it('rechaza un evento que termina antes de empezar', async () => {
    const empresa = await crearEmpresa();
    const dir = await sesion('SUPERADMIN', empresa.id);
    const res = await request(app).post('/api/agenda').set('Authorization', `Bearer ${dir.token}`)
      .send({ ...evento, fin: '2026-12-01T09:00:00+01:00' });
    expect(res.status).toBe(400);
  });

  it('guarda en UTC y consulta por intervalo con zona horaria', async () => {
    const empresa = await crearEmpresa();
    const dir = await sesion('SUPERADMIN', empresa.id);
    await request(app).post('/api/agenda').set('Authorization', `Bearer ${dir.token}`).send(evento);
    const fila = await prisma.evento.findFirstOrThrow({ where: { tenantId: empresa.id } });
    expect(fila.inicio.toISOString()).toBe('2026-12-01T09:00:00.000Z');
    const dentro = await request(app)
      .get('/api/agenda?desde=2026-12-01T00:00:00Z&hasta=2026-12-02T00:00:00Z')
      .set('Authorization', `Bearer ${dir.token}`);
    const fuera = await request(app)
      .get('/api/agenda?desde=2026-12-03T00:00:00Z&hasta=2026-12-04T00:00:00Z')
      .set('Authorization', `Bearer ${dir.token}`);
    expect(dentro.body.total).toBe(1);
    expect(fuera.body.total).toBe(0);
  });

  it('la consulta sin zona horaria responde 400', async () => {
    const empresa = await crearEmpresa();
    const dir = await sesion('SUPERADMIN', empresa.id);
    const res = await request(app).get('/api/agenda?desde=2026-12-01&hasta=2026-12-02').set('Authorization', `Bearer ${dir.token}`);
    expect(res.status).toBe(400);
  });

  it('solo el superadmin gestiona la agenda; un usuario no crea ni edita eventos', async () => {
    const empresa = await crearEmpresa();
    const normal = await sesion('INVERSOR', empresa.id);
    const coord = await sesion('SUPERADMIN', empresa.id);
    const otroCoord = await sesion('INVERSOR', empresa.id);
    expect((await request(app).post('/api/agenda').set('Authorization', `Bearer ${normal.token}`).send(evento)).status).toBe(403);
    const creado = await request(app).post('/api/agenda').set('Authorization', `Bearer ${coord.token}`).send(evento);
    expect(creado.status).toBe(201);
    const ajeno = await request(app).patch(`/api/agenda/${creado.body.evento.id}`).set('Authorization', `Bearer ${otroCoord.token}`).send({ titulo: 'X' });
    expect(ajeno.status).toBe(403);
  });

  it('borrar un evento queda auditado', async () => {
    const empresa = await crearEmpresa();
    const dir = await sesion('SUPERADMIN', empresa.id);
    const creado = await request(app).post('/api/agenda').set('Authorization', `Bearer ${dir.token}`).send(evento);
    await request(app).delete(`/api/agenda/${creado.body.evento.id}`).set('Authorization', `Bearer ${dir.token}`);
    expect(await prisma.registroAuditoria.count({ where: { tenantId: empresa.id, entidad: 'Evento', accion: 'BORRAR' } })).toBe(1);
  });
});
