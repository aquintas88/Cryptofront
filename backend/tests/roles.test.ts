import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { PASSWORD_PRUEBA, crearEmpresa, crearUsuario, emailUnico, limpiarBD, tokenDe } from './helpers';

// Permisos por rol. Los roles de empresa (director y coordinador) se han eliminado:
//   SUPERADMIN: gestiona la organización (sucursales y usuarios).
//   INVERSOR:   solo la zona de inversores.
const app = crearApp({ limiteAuth: 1000 });

async function tokenDeRol(tenantId: string, rol: 'SUPERADMIN' | 'INVERSOR') {
  const { usuario } = await crearUsuario({ tenantId, rol });
  return tokenDe(app, usuario.email);
}

describe('roles dentro de la empresa', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('el superadmin puede leer sucursales y usuarios de la empresa', async () => {
    const empresa = await crearEmpresa();
    const token = await tokenDeRol(empresa.id, 'SUPERADMIN');
    const suc = await request(app).get('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`);
    const usr = await request(app).get('/api/organizacion/usuarios').set('Authorization', `Bearer ${token}`);
    expect(suc.status).toBe(200);
    expect(usr.status).toBe(200);
  });

  it('un usuario no puede crear sucursales ni usuarios', async () => {
    const empresa = await crearEmpresa();
    const token = await tokenDeRol(empresa.id, 'INVERSOR');
    const suc = await request(app).post('/api/organizacion/sucursales').set('Authorization', `Bearer ${token}`).send({ nombre: 'X' });
    const usr = await request(app)
      .post('/api/organizacion/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X', email: emailUnico(), password: PASSWORD_PRUEBA, rol: 'INVERSOR' });
    expect(suc.status).toBe(403);
    expect(usr.status).toBe(403);
  });

  it('el superadmin puede crear usuarios de empresa', async () => {
    const empresa = await crearEmpresa();
    const token = await tokenDeRol(empresa.id, 'SUPERADMIN');
    for (const rol of ['INVERSOR', 'INVERSOR']) {
      const res = await request(app)
        .post('/api/organizacion/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: rol, email: emailUnico(rol.toLowerCase()), password: PASSWORD_PRUEBA, rol });
      expect(res.status).toBe(201);
      expect(res.body.usuario.rol).toBe(rol);
    }
  });

  it('el rol SUPERADMIN no se puede asignar desde una empresa', async () => {
    const empresa = await crearEmpresa();
    const token = await tokenDeRol(empresa.id, 'SUPERADMIN');
    const res = await request(app)
      .post('/api/organizacion/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X', email: emailUnico(), password: PASSWORD_PRUEBA, rol: 'SUPERADMIN' });
    expect(res.status).toBe(400);
  });

  it('un usuario nuevo sin rol indicado queda como USUARIO por defecto', async () => {
    const empresa = await crearEmpresa();
    const u = await prisma.usuario.create({
      data: { tenantId: empresa.id, email: emailUnico('defecto'), nombre: 'Por defecto', passwordHash: 'x' },
    });
    expect(u.rol).toBe('INVERSOR');
  });
});
