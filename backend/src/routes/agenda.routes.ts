import { Router } from 'express';
import { requiereRol, requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { ErrorApp } from '../lib/errores';
import { leerParamsListado } from '../lib/listados';
import { idValido, texto, textoOpcional } from '../lib/validar';
import * as agenda from '../services/agenda.service';
import { Usuario } from '../services/contexto';

const router = Router();
router.use(requiereSesion);

// Consulta por intervalo: desde y hasta son obligatorios y deben llevar zona horaria.
router.get('/', asincrona(async (req, res) => {
  const desde = agenda.fechaConZona(req.query.desde, 'desde');
  const hasta = agenda.fechaConZona(req.query.hasta, 'hasta');
  if (hasta <= desde) throw new ErrorApp(400, 'El intervalo no es válido');
  const params = leerParamsListado(req.query, agenda.ORDEN_EVENTOS, 'inicio');
  res.json(await agenda.listarEventos(res.locals.usuario.tenantId, desde, hasta, params));
}));

// Crear y editar: director y coordinador. Cada uno edita sus eventos; el director, todos.
router.post('/', requiereRol('DIRECTOR_EMPRESA', 'COORDINADOR'), asincrona(async (req, res) => {
  const evento = await agenda.crearEvento(res.locals.usuario as Usuario, {
    titulo: texto(req.body?.titulo, 'titulo', { max: 160 }),
    descripcion: textoOpcional(req.body?.descripcion, 'descripcion', 2000),
    inicio: agenda.fechaConZona(req.body?.inicio, 'inicio'),
    fin: agenda.fechaConZona(req.body?.fin, 'fin'),
    ubicacion: textoOpcional(req.body?.ubicacion, 'ubicacion', 200),
  });
  res.status(201).json({ evento });
}));

router.patch('/:id', requiereRol('DIRECTOR_EMPRESA', 'COORDINADOR'), asincrona(async (req, res) => {
  const cambios: { titulo?: string; descripcion?: string | null; inicio?: Date; fin?: Date; ubicacion?: string | null } = {};
  if (req.body?.titulo !== undefined) cambios.titulo = texto(req.body.titulo, 'titulo', { max: 160 });
  if (req.body?.descripcion !== undefined) cambios.descripcion = textoOpcional(req.body.descripcion, 'descripcion', 2000);
  if (req.body?.ubicacion !== undefined) cambios.ubicacion = textoOpcional(req.body.ubicacion, 'ubicacion', 200);
  if (req.body?.inicio !== undefined) cambios.inicio = agenda.fechaConZona(req.body.inicio, 'inicio');
  if (req.body?.fin !== undefined) cambios.fin = agenda.fechaConZona(req.body.fin, 'fin');
  if (Object.keys(cambios).length === 0) throw new ErrorApp(400, 'Nada que cambiar');
  const evento = await agenda.actualizarEvento(res.locals.usuario as Usuario, idValido(req.params.id, 'id'), cambios);
  res.json({ evento });
}));

router.delete('/:id', requiereRol('DIRECTOR_EMPRESA', 'COORDINADOR'), asincrona(async (req, res) => {
  res.json(await agenda.eliminarEvento(res.locals.usuario as Usuario, idValido(req.params.id, 'id')));
}));

export default router;
