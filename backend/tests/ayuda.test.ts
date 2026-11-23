import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { ARTICULOS } from '../src/datos/ayuda';
import { CHANGELOG } from '../src/datos/changelog';
import { crearUsuario, limpiarBD, tokenDe } from './helpers';

const app = crearApp({ limiteAuth: 1000 });

describe('ayuda y novedades (contenido)', () => {
  afterAll(async () => {
    await limpiarBD();
    await prisma.$disconnect();
  });

  it('los ids de artículo son únicos', () => {
    const ids = ARTICULOS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada función nueva de las novedades enlaza un artículo de ayuda existente', () => {
    const ids = new Set(ARTICULOS.map((a) => a.id));
    const funciones = CHANGELOG.flatMap((e) => e.cambios).filter((c) => c.tipo === 'feature');
    expect(funciones.length).toBeGreaterThan(0);
    for (const f of funciones) {
      expect(f.articuloId, `falta articuloId en: ${f.texto}`).toBeDefined();
      expect(ids.has(f.articuloId!), `articuloId inexistente: ${f.articuloId}`).toBe(true);
    }
  });

  it('ningún artículo queda huérfano: todos aparecen en alguna novedad', () => {
    const enlazados = new Set(CHANGELOG.flatMap((e) => e.cambios).map((c) => c.articuloId));
    for (const a of ARTICULOS) {
      if (a.id === 'ayuda-changelog') continue;
      expect(enlazados.has(a.id), `artículo sin novedad: ${a.id}`).toBe(true);
    }
  });
});

describe('ayuda y novedades (API)', () => {
  it('exige sesión', async () => {
    expect((await request(app).get('/api/ayuda')).status).toBe(401);
    expect((await request(app).get('/api/novedades')).status).toBe(401);
  });

  it('un usuario con sesión lee el índice, un artículo y las novedades', async () => {
    const { usuario } = await crearUsuario({ rol: 'INVERSOR' });
    const token = await tokenDe(app, usuario.email);
    const indice = await request(app).get('/api/ayuda').set('Authorization', `Bearer ${token}`);
    expect(indice.body.articulos.length).toBe(ARTICULOS.length);
    expect(indice.body.articulos[0].contenido).toBeUndefined();
    const uno = await request(app).get('/api/ayuda/agenda').set('Authorization', `Bearer ${token}`);
    expect(uno.body.articulo.id).toBe('agenda');
    const novedades = await request(app).get('/api/novedades').set('Authorization', `Bearer ${token}`);
    expect(novedades.body.versionActual).toBe('0.2.0');
  });

  it('un artículo inexistente responde 404', async () => {
    const { usuario } = await crearUsuario({ rol: 'INVERSOR' });
    const token = await tokenDe(app, usuario.email);
    const res = await request(app).get('/api/ayuda/no-existe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
