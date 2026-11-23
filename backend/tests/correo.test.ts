import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { usarTransporteDePrueba } from '../src/lib/correo';
import { crearPlataforma, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });
const VARS = ['SMTP_HOST', 'SMTP_PUERTO', 'SMTP_USUARIO', 'SMTP_CONTRASENA', 'CORREO_REMITENTE'] as const;
const anterior: Record<string, string | undefined> = {};
const CONTRASENA_SMTP = 'contrasena-smtp-ficticia-77';

interface Enviado { to: string; from: string }
function transporteFalso(modo: 'ok' | 'fallo') {
  const enviados: Enviado[] = [];
  return {
    enviados,
    verify: async () => {
      if (modo === 'fallo') throw new Error(`conexión rechazada por ${CONTRASENA_SMTP}`);
    },
    sendMail: async (m: { to: string; from: string }) => {
      if (modo === 'fallo') throw new Error('fallo SMTP');
      enviados.push({ to: m.to, from: m.from });
      return {};
    },
  };
}

function configurar() {
  process.env.SMTP_HOST = 'smtp.ejemplo.test';
  process.env.SMTP_PUERTO = '587';
  process.env.SMTP_USUARIO = 'usuario-ficticio';
  process.env.SMTP_CONTRASENA = CONTRASENA_SMTP;
  process.env.CORREO_REMITENTE = 'no-responder@ejemplo.test';
}

describe('correo del sistema', () => {
  beforeEach(async () => {
    for (const v of VARS) anterior[v] = process.env[v];
    for (const v of VARS) delete process.env[v];
    usarTransporteDePrueba(null);
    await limpiarBD();
  });
  afterAll(async () => {
    for (const v of VARS) {
      if (anterior[v] === undefined) delete process.env[v];
      else process.env[v] = anterior[v];
    }
    usarTransporteDePrueba(null);
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('sin configurar, el estado lo dice y la prueba responde 409', async () => {
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const estado = await request(app).get('/api/plataforma/correo/estado').set('Authorization', `Bearer ${token}`);
    expect(estado.body).toEqual({ configurado: false, conexion: null });
    const prueba = await request(app).post('/api/plataforma/correo/prueba').set('Authorization', `Bearer ${token}`)
      .send({ destinatario: 'admin@ejemplo.test' });
    expect(prueba.status).toBe(409);
  });

  it('SMTP_PUERTO vacío usa 587 por defecto y no desactiva el correo', async () => {
    configurar();
    process.env.SMTP_PUERTO = '';
    usarTransporteDePrueba(transporteFalso('ok'));
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const res = await request(app).get('/api/plataforma/correo/estado').set('Authorization', `Bearer ${token}`);
    expect(res.body).toEqual({ configurado: true, conexion: 'ok' });
  });

  it('configurado y con conexión correcta, el estado lo indica sin revelar credenciales', async () => {
    configurar();
    usarTransporteDePrueba(transporteFalso('ok'));
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const res = await request(app).get('/api/plataforma/correo/estado').set('Authorization', `Bearer ${token}`);
    expect(res.body).toEqual({ configurado: true, conexion: 'ok' });
    expect(JSON.stringify(res.body)).not.toContain(CONTRASENA_SMTP);
  });

  it('si la conexión falla, el estado es error y el detalle no sale en la respuesta', async () => {
    configurar();
    usarTransporteDePrueba(transporteFalso('fallo'));
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const res = await request(app).get('/api/plataforma/correo/estado').set('Authorization', `Bearer ${token}`);
    expect(res.body.conexion).toBe('error');
    expect(JSON.stringify(res.body)).not.toContain(CONTRASENA_SMTP);
  });

  it('la prueba envía un correo al destinatario y queda auditada', async () => {
    configurar();
    const t = transporteFalso('ok');
    usarTransporteDePrueba(t);
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const res = await request(app).post('/api/plataforma/correo/prueba').set('Authorization', `Bearer ${token}`)
      .send({ destinatario: 'admin@ejemplo.test' });
    expect(res.status).toBe(200);
    expect(t.enviados).toEqual([{ to: 'admin@ejemplo.test', from: 'no-responder@ejemplo.test' }]);
    const evento = await prisma.registroAuditoria.findFirstOrThrow({ where: { entidad: 'Correo' }, orderBy: { creadoEn: 'desc' } });
    expect(evento.cambios).toEqual({ evento: 'PRUEBA_CORREO', resultado: 'enviado' });
  });

  it('si el envío falla, responde 502 sin detalles y deja el evento', async () => {
    configurar();
    usarTransporteDePrueba(transporteFalso('fallo'));
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const res = await request(app).post('/api/plataforma/correo/prueba').set('Authorization', `Bearer ${token}`)
      .send({ destinatario: 'admin@ejemplo.test' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('SMTP');
    const evento = await prisma.registroAuditoria.findFirstOrThrow({ where: { entidad: 'Correo' }, orderBy: { creadoEn: 'desc' } });
    expect(evento.cambios).toEqual({ evento: 'PRUEBA_CORREO', resultado: 'error' });
  });

  it('un destinatario no válido responde 400 y no envía nada', async () => {
    configurar();
    const t = transporteFalso('ok');
    usarTransporteDePrueba(t);
    const plat = await crearPlataforma();
    const token = await tokenDe(app, plat.usuario.email);
    const res = await request(app).post('/api/plataforma/correo/prueba').set('Authorization', `Bearer ${token}`)
      .send({ destinatario: 'no-es-correo' });
    expect(res.status).toBe(400);
    expect(t.enviados).toHaveLength(0);
  });

  it('solo SUPERADMIN usa el correo del sistema', async () => {
    configurar();
    usarTransporteDePrueba(transporteFalso('ok'));
    const { usuario } = await crearUsuario({ rol: 'DIRECTOR_EMPRESA' });
    const token = await tokenDe(app, usuario.email);
    const res = await request(app).get('/api/plataforma/correo/estado').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
