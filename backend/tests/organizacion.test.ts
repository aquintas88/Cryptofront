import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { PASSWORD_PRUEBA, crearEmpresa, crearUsuario, emailUnico, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

async function directorDe(tenantId: string) {
  const { usuario } = await crearUsuario({ tenantId, rol: 'DIRECTOR_EMPRESA' });
  return { usuario, token: await tokenDe(app, usuario.email) };
}

describe('organización: sucursales y usuarios', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  describe('sucursales', () => {
    it('el director crea una sucursal y la lista', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const alta = await request(app)
        .post('/api/organizacion/sucursales')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Sucursal Norte', direccion: 'Calle ficticia 1' });
      expect(alta.status).toBe(201);
      const lista = await request(app).get('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`);
      expect(lista.body.datos.map((s: { nombre: string }) => s.nombre)).toEqual(['Sucursal Norte']);
    });

    it('un usuario sin rol de director no puede crear sucursales', async () => {
      const empresa = await crearEmpresa();
      const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'USUARIO' });
      const token = await tokenDe(app, usuario.email);
      const res = await request(app)
        .post('/api/organizacion/sucursales')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Intento' });
      expect(res.status).toBe(403);
    });

    it('el nombre de sucursal es único dentro de la empresa', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'Centro' });
      const dup = await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'Centro' });
      expect(dup.status).toBe(409);
    });

    it('el director puede desactivar una sucursal', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const alta = await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'Oeste' });
      const res = await request(app)
        .patch(`/api/organizacion/sucursales/${alta.body.sucursal.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activa: false });
      expect(res.status).toBe(200);
      expect(res.body.sucursal.activa).toBe(false);
    });
  });

  describe('usuarios', () => {
    it('el director crea un usuario con rol USUARIO y contraseña inicial', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const email = emailUnico('nuevo');
      const res = await request(app)
        .post('/api/organizacion/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nuevo', email, password: PASSWORD_PRUEBA, rol: 'USUARIO' });
      expect(res.status).toBe(201);
      expect(res.body.usuario.email).toBe(email);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      // El usuario nuevo puede iniciar sesión con la contraseña inicial.
      expect(await tokenDe(app, email)).toBeTruthy();
    });

    it('no se puede crear un usuario con rol SUPERADMIN desde una empresa', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const res = await request(app)
        .post('/api/organizacion/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Intruso', email: emailUnico(), password: PASSWORD_PRUEBA, rol: 'SUPERADMIN' });
      expect(res.status).toBe(400);
    });

    it('la contraseña inicial debe tener al menos 12 caracteres', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const res = await request(app)
        .post('/api/organizacion/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Corto', email: emailUnico(), password: 'corta', rol: 'USUARIO' });
      expect(res.status).toBe(400);
    });

    it('el email ya registrado responde 409', async () => {
      const empresa = await crearEmpresa();
      const { token, usuario } = await directorDe(empresa.id);
      const res = await request(app)
        .post('/api/organizacion/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Duplicado', email: usuario.email, password: PASSWORD_PRUEBA, rol: 'USUARIO' });
      expect(res.status).toBe(409);
    });

    it('lista los usuarios de la empresa sin datos sensibles y en orden estable', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const res = await request(app).get('/api/organizacion/usuarios').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const texto = JSON.stringify(res.body);
      expect(texto).not.toContain('passwordHash');
      expect(texto).not.toContain('twoFactor');
      const nombres = res.body.datos.map((u: { nombre: string }) => u.nombre);
      expect(nombres).toEqual([...nombres].sort((a: string, b: string) => a.localeCompare(b)));
    });

    it('desactivar a un usuario cierra su acceso de inmediato', async () => {
      const empresa = await crearEmpresa();
      const { token } = await directorDe(empresa.id);
      const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'USUARIO' });
      const tokenUsuario = await tokenDe(app, usuario.email);

      const res = await request(app)
        .patch(`/api/organizacion/usuarios/${usuario.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activo: false });
      expect(res.status).toBe(200);

      const yo = await request(app).get('/api/auth/yo').set('Authorization', `Bearer ${tokenUsuario}`);
      expect(yo.status).toBe(401);
      const login = await request(app).post('/api/auth/login').send({ email: usuario.email, password: PASSWORD_PRUEBA });
      expect(login.status).toBe(401);
    });

    it('el director no puede desactivarse ni quitarse el rol a sí mismo', async () => {
      const empresa = await crearEmpresa();
      const { usuario, token } = await directorDe(empresa.id);
      const desactivar = await request(app)
        .patch(`/api/organizacion/usuarios/${usuario.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activo: false });
      expect(desactivar.status).toBe(409);
      const degradar = await request(app)
        .patch(`/api/organizacion/usuarios/${usuario.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rol: 'USUARIO' });
      expect(degradar.status).toBe(409);
    });

    it('un usuario sin rol de director no ve la lista de usuarios', async () => {
      const empresa = await crearEmpresa();
      const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'USUARIO' });
      const token = await tokenDe(app, usuario.email);
      const res = await request(app).get('/api/organizacion/usuarios').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('un usuario sin autenticar no accede a la organización', async () => {
      const res = await request(app).get('/api/organizacion/sucursales');
      expect(res.status).toBe(401);
    });
  });
});
