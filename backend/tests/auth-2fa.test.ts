import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cargarConfig } from '../src/config';
import { descifrar } from '../src/lib/criptografia';
import { codigoTOTP } from '../src/lib/totp';
import { crearUsuario, limpiarBD } from './helpers';

const app = crearApp({ limiteAuth: 1000 });
const ahoraContador = () => Math.floor(Date.now() / 1000 / 30);

async function sesionConPassword(email: string, password: string) {
  return request(app).post('/api/auth/login').send({ email, password });
}

// Configura y activa el 2FA de un usuario que ya ha iniciado sesión. Devuelve el secreto en claro para la prueba.
async function activarDosFactores(accessToken: string) {
  const conf = await request(app).post('/api/auth/2fa/configurar').set('Authorization', `Bearer ${accessToken}`);
  const secreto: string = conf.body.secreto;
  const act = await request(app)
    .post('/api/auth/2fa/activar')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ codigo: codigoTOTP(secreto, ahoraContador()) });
  return { secreto, activacion: act };
}

describe('2FA (TOTP)', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('configurar devuelve un secreto y una URI, y lo guarda cifrado y pendiente', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    const res = await request(app)
      .post('/api/auth/2fa/configurar')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.uri).toMatch(/^otpauth:\/\/totp\//);

    const fresco = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(fresco.twoFactorPendienteCifrado).toBeTruthy();
    expect(fresco.twoFactorPendienteCifrado).not.toContain(res.body.secreto);
    expect(fresco.twoFactorActivo).toBe(false);
    // El secreto guardado descifra al mismo valor que se entregó.
    expect(descifrar(fresco.twoFactorPendienteCifrado!, cargarConfig().secretsMasterKey)).toBe(res.body.secreto);
  });

  it('activar con un código incorrecto no activa el 2FA', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await request(app).post('/api/auth/2fa/configurar').set('Authorization', `Bearer ${login.body.accessToken}`);
    const res = await request(app)
      .post('/api/auth/2fa/activar')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ codigo: '000000' });
    expect(res.status).toBe(401);
    const fresco = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(fresco.twoFactorActivo).toBe(false);
  });

  it('con 2FA activo, el login no devuelve sesión sino un token previo al 2FA', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await activarDosFactores(login.body.accessToken);

    const res = await sesionConPassword(usuario.email, password);
    expect(res.status).toBe(200);
    expect(res.body.requiere2fa).toBe(true);
    expect(res.body.accessToken).toBeUndefined();
    expect(typeof res.body.preToken).toBe('string');
  });

  it('el token previo al 2FA no abre la API', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await activarDosFactores(login.body.accessToken);
    const paso1 = await sesionConPassword(usuario.email, password);

    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${paso1.body.preToken}`);
    expect(res.status).toBe(401);
  });

  it('verificar con el código correcto inicia sesión', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    const { secreto } = await activarDosFactores(login.body.accessToken);
    const paso1 = await sesionConPassword(usuario.email, password);

    const res = await request(app)
      .post('/api/auth/2fa/verificar')
      .send({ preToken: paso1.body.preToken, codigo: codigoTOTP(secreto, ahoraContador()) });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('verificar con código incorrecto no inicia sesión y cuenta como fallo', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await activarDosFactores(login.body.accessToken);
    const paso1 = await sesionConPassword(usuario.email, password);

    const res = await request(app)
      .post('/api/auth/2fa/verificar')
      .send({ preToken: paso1.body.preToken, codigo: '000000' });
    expect(res.status).toBe(401);
    const fresco = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(fresco.intentosFallidos).toBe(1);
  });

  it('5 códigos incorrectos bloquean la cuenta', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await activarDosFactores(login.body.accessToken);
    const paso1 = await sesionConPassword(usuario.email, password);

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/2fa/verificar').send({ preToken: paso1.body.preToken, codigo: '000000' });
    }
    const res = await request(app)
      .post('/api/auth/2fa/verificar')
      .send({ preToken: paso1.body.preToken, codigo: '000000' });
    expect(res.status).toBe(423);
  });

  it('no se puede volver a configurar el 2FA cuando ya está activo (regresión SEC-01)', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await activarDosFactores(login.body.accessToken);
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });

    const res = await request(app)
      .post('/api/auth/2fa/configurar')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(409);
    const despues = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(despues.twoFactorSecretoCifrado).toBe(antes.twoFactorSecretoCifrado);
  });

  it('la respuesta de /yo nunca incluye secretos del 2FA ni hash de contraseña', async () => {
    const { usuario, password } = await crearUsuario();
    const login = await sesionConPassword(usuario.email, password);
    await activarDosFactores(login.body.accessToken);
    const res = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    const texto = JSON.stringify(res.body);
    // twoFactorActivo (booleano) sí se muestra; los secretos cifrados y el hash no.
    expect(texto).not.toContain('twoFactorSecretoCifrado');
    expect(texto).not.toContain('twoFactorPendienteCifrado');
    expect(texto).not.toContain('passwordHash');
    expect(res.body.usuario.twoFactorActivo).toBe(true);
  });
});
