import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { limpiarValor, rellenar } from '../src/services/plantillas.service';
import { crearEmpresa, crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });
const CONTENIDO = 'Estimado {{cliente}}, su cita en {{sucursal}} es el {{fecha}}.';

async function directorDe(tenantId: string) {
  const { usuario } = await crearUsuario({ tenantId, rol: 'SUPERADMIN' });
  return tokenDe(app, usuario.email);
}

describe('limpieza y sustitución de variables (unidad)', () => {
  it('quita caracteres de control y conserva el salto de línea', () => {
    expect(limpiarValor('a\u0000b\u0007c\nd')).toBe('abc\nd');
  });

  it('limita la longitud de cada valor', () => {
    expect(limpiarValor('x'.repeat(2000))).toHaveLength(500);
  });

  it('las variables sin valor quedan vacías y el texto no se reinterpreta', () => {
    const r = rellenar('Hola {{nombre}} {{otra}}', { nombre: '{{otra}}<script>' });
    expect(r).toBe('Hola {{otra}}<script> ');
  });
});

describe('plantillas PDF', () => {
  beforeEach(limpiarBD);
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('el director crea una plantilla y la lista', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Recordatorio', contenido: CONTENIDO });
    expect(alta.status).toBe(201);
    const lista = await request(app).get('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`);
    expect(lista.body.total).toBe(1);
    expect(lista.body.datos[0].nombre).toBe('Recordatorio');
  });

  it('genera un PDF válido con las variables sustituidas', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Cita', contenido: CONTENIDO });
    const res = await request(app)
      .post(`/api/organizacion/plantillas/${alta.body.plantilla.id}/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .send({ variables: { cliente: 'Cliente ficticio', sucursal: 'Centro', fecha: '1 de diciembre' } })
      .buffer(true)
      .parse((r, cb) => {
        const trozos: Buffer[] = [];
        r.on('data', (t: Buffer) => trozos.push(t));
        r.on('end', () => cb(null, Buffer.concat(trozos)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('un valor con HTML o caracteres de control se acepta como texto y el PDF sigue siendo válido', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Hostil', contenido: CONTENIDO });
    const res = await request(app)
      .post(`/api/organizacion/plantillas/${alta.body.plantilla.id}/pdf`)
      .set('Authorization', `Bearer ${token}`)
      .send({ variables: { cliente: '<script>alert(1)</script>\u0000', sucursal: 'x', fecha: 'y' } })
      .buffer(true)
      .parse((r, cb) => {
        const trozos: Buffer[] = [];
        r.on('data', (t: Buffer) => trozos.push(t));
        r.on('end', () => cb(null, Buffer.concat(trozos)));
      });
    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rechaza nombres de variable no válidos y variables anidadas', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Valida', contenido: CONTENIDO });
    const id = alta.body.plantilla.id;
    const malaClave = await request(app).post(`/api/organizacion/plantillas/${id}/pdf`).set('Authorization', `Bearer ${token}`)
      .send({ variables: { 'a b': 'x' } });
    const anidada = await request(app).post(`/api/organizacion/plantillas/${id}/pdf`).set('Authorization', `Bearer ${token}`)
      .send({ variables: { cliente: { dentro: 'x' } } });
    expect(malaClave.status).toBe(400);
    expect(anidada.status).toBe(400);
  });

  it('un usuario no crea plantillas ni genera PDF; el superadmin sí', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Compartida', contenido: CONTENIDO });
    const { usuario } = await crearUsuario({ tenantId: empresa.id, rol: 'USUARIO' });
    const tokenCoord = await tokenDe(app, usuario.email);
    const crea = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${tokenCoord}`)
      .send({ nombre: 'Nueva', contenido: CONTENIDO });
    const pdfUsuario = await request(app).post(`/api/organizacion/plantillas/${alta.body.plantilla.id}/pdf`)
      .set('Authorization', `Bearer ${tokenCoord}`).send({});
    const pdfSuperadmin = await request(app).post(`/api/organizacion/plantillas/${alta.body.plantilla.id}/pdf`)
      .set('Authorization', `Bearer ${token}`).send({});
    expect(crea.status).toBe(403);
    expect(pdfUsuario.status).toBe(403);
    expect(pdfSuperadmin.status).toBe(200);
  });

  it('una plantilla de otra empresa responde 404', async () => {
    const a = await crearEmpresa('A');
    const b = await crearEmpresa('B');
    const tokenB = await directorDe(b.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${tokenB}`)
      .send({ nombre: 'Ajena', contenido: CONTENIDO });
    const tokenA = await directorDe(a.id);
    const res = await request(app).get(`/api/organizacion/plantillas/${alta.body.plantilla.id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it('el nombre de plantilla es único dentro de la empresa', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`).send({ nombre: 'Doble', contenido: CONTENIDO });
    const dup = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`).send({ nombre: 'Doble', contenido: CONTENIDO });
    expect(dup.status).toBe(409);
  });

  it('editar una plantilla audita solo los campos cambiados, sin su texto', async () => {
    const empresa = await crearEmpresa();
    const token = await directorDe(empresa.id);
    const alta = await request(app).post('/api/organizacion/plantillas').set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Editable', contenido: CONTENIDO });
    await request(app).patch(`/api/organizacion/plantillas/${alta.body.plantilla.id}`).set('Authorization', `Bearer ${token}`)
      .send({ contenido: 'Texto nuevo ficticio {{cliente}}' });
    const reg = await prisma.registroAuditoria.findFirstOrThrow({
      where: { tenantId: empresa.id, entidad: 'PlantillaDocumento', accion: 'EDITAR' },
    });
    expect(reg.cambios).toEqual({ campos: ['contenido'] });
    expect(JSON.stringify(reg)).not.toContain('Texto nuevo');
  });
});
