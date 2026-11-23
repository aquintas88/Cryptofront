import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cargarConfig } from '../src/config';
import { descifrar } from '../src/lib/criptografia';
import { obtenerValorParaUso } from '../src/services/secretos.service';
import { crearEmpresa, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });
const VALOR_SECRETO = 'valor-secreto-ficticio-9f8e7d6c';

async function directorDe(tenantId: string) {
  const { usuario } = await crearUsuario({ tenantId, rol: 'SUPERADMIN' });
  return tokenDe(app, usuario.email);
}

describe('secretos de integración', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('guardar un secreto no devuelve su valor', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const res = await request(app)
      .put('/api/organizacion/secretos')
      .set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(VALOR_SECRETO);
  });

  it('listar muestra que existe el secreto, no su valor ni parte de él', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    const res = await request(app).get('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.datos).toHaveLength(1);
    expect(res.body.datos[0].configurado).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(VALOR_SECRETO);
    expect(JSON.stringify(res.body)).not.toContain(VALOR_SECRETO.slice(-4));
  });

  it('en la base de datos el valor está cifrado y se recupera solo con la clave', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    const fila = await prisma.secretoIntegracion.findFirstOrThrow({ where: { tenantId: empresa.id } });
    expect(fila.valorCifrado).not.toContain(VALOR_SECRETO);
    expect(descifrar(fila.valorCifrado, cargarConfig().secretsMasterKey)).toBe(VALOR_SECRETO);
    expect(await obtenerValorParaUso(empresa.id, 'whatsapp', 'api_key', 'empresa')).toBe(VALOR_SECRETO);
  });

  it('la auditoría registra que cambió, sin el valor', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    const registros = await prisma.registroAuditoria.findMany({ where: { tenantId: empresa.id, entidad: 'SecretoIntegracion' } });
    expect(registros).toHaveLength(1);
    expect(registros[0].accion).toBe('CREAR');
    expect(JSON.stringify(registros)).not.toContain(VALOR_SECRETO);
  });

  it('volver a guardar el mismo secreto lo actualiza y audita EDITAR', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const cuerpo = { integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO };
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`).send(cuerpo);
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`).send({ ...cuerpo, valor: 'otro-valor-ficticio-123' });
    expect(await prisma.secretoIntegracion.count({ where: { tenantId: empresa.id } })).toBe(1);
    expect(await obtenerValorParaUso(empresa.id, 'whatsapp', 'api_key', 'empresa')).toBe('otro-valor-ficticio-123');
    const acciones = (await prisma.registroAuditoria.findMany({ where: { tenantId: empresa.id, entidad: 'SecretoIntegracion' } })).map((r) => r.accion);
    expect(acciones).toEqual(expect.arrayContaining(['CREAR', 'EDITAR']));
  });

  it('un secreto por sucursal solo se puede asociar a una sucursal de la misma empresa', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const sucursalB = await prisma.sucursal.create({ data: { tenantId: b.id, nombre: 'Ajena' } });
    const tokenA = await directorDe(a.id);
    const res = await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${tokenA}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', ambito: sucursalB.id, valor: VALOR_SECRETO });
    expect(res.status).toBe(400);
  });

  it('el coordinador no puede ver ni escribir secretos', async () => {
    const empresa = await crearEmpresa();
    const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'USUARIO' });
    const token = await tokenDe(app, usuario.email);
    const lista = await request(app).get('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`);
    const escribe = await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    expect(lista.status).toBe(403);
    expect(escribe.status).toBe(403);
  });

  it('no se puede borrar un secreto de otra empresa (404)', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const tokenB = await directorDe(b.id);
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${tokenB}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    const tokenA = await directorDe(a.id);
    const res = await request(app).delete('/api/organizacion/secretos').set('Authorization', `Bearer ${tokenA}`)
      .send({ integracion: 'whatsapp', campo: 'api_key' });
    expect(res.status).toBe(404);
    expect(await prisma.secretoIntegracion.count({ where: { tenantId: b.id } })).toBe(1);
  });

  it('borrar un secreto lo elimina y audita BORRAR sin valor', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key', valor: VALOR_SECRETO });
    const res = await request(app).delete('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'whatsapp', campo: 'api_key' });
    expect(res.status).toBe(200);
    expect(await prisma.secretoIntegracion.count({ where: { tenantId: empresa.id } })).toBe(0);
    const borrado = await prisma.registroAuditoria.findFirstOrThrow({ where: { tenantId: empresa.id, accion: 'BORRAR' } });
    expect(JSON.stringify(borrado)).not.toContain(VALOR_SECRETO);
  });

  it('valida el nombre de integración y el campo', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const res = await request(app).put('/api/organizacion/secretos').set('Authorization', `Bearer ${token}`)
      .send({ integracion: 'Con Espacios!', campo: 'api_key', valor: VALOR_SECRETO });
    expect(res.status).toBe(400);
  });
});
