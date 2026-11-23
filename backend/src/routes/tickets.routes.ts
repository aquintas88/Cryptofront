import { Router } from 'express';
import { requiereRol, requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { ErrorApp } from '../lib/errores';
import { leerParamsListado } from '../lib/listados';
import { idValido, texto } from '../lib/validar';
import * as tickets from '../services/tickets.service';
import { Usuario } from '../services/contexto';

const router = Router();
router.use(requiereSesion);

router.get('/', asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, tickets.ORDEN_TICKETS, 'creadoEn', 'desc');
  res.json(await tickets.listarTickets(res.locals.usuario as Usuario, params));
}));

router.post('/', asincrona(async (req, res) => {
  const ticket = await tickets.crearTicket(res.locals.usuario as Usuario, {
    asunto: texto(req.body?.asunto, 'asunto', { max: 160 }),
    descripcion: texto(req.body?.descripcion, 'descripcion', { max: 5000 }),
    criticidad: req.body?.criticidad === undefined ? 'MEDIA' : tickets.validarCriticidad(req.body.criticidad),
  });
  res.status(201).json({ ticket });
}));

router.get('/:id', asincrona(async (req, res) => {
  res.json({ ticket: await tickets.obtenerTicket(res.locals.usuario as Usuario, idValido(req.params.id, 'id')) });
}));

router.patch('/:id', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const cambios: { estado?: 'ABIERTO' | 'EN_CURSO' | 'RESUELTO' | 'CERRADO'; criticidad?: 'BAJA' | 'MEDIA' | 'ALTA'; asignadoAId?: string | null } = {};
  if (req.body?.estado !== undefined) cambios.estado = tickets.validarEstado(req.body.estado);
  if (req.body?.criticidad !== undefined) cambios.criticidad = tickets.validarCriticidad(req.body.criticidad);
  if (req.body?.asignadoAId !== undefined) {
    cambios.asignadoAId = req.body.asignadoAId ? idValido(req.body.asignadoAId, 'asignadoAId') : null;
  }
  if (Object.keys(cambios).length === 0) throw new ErrorApp(400, 'Nada que cambiar');
  const ticket = await tickets.actualizarTicket(res.locals.usuario as Usuario, idValido(req.params.id, 'id'), cambios);
  res.json({ ticket });
}));

router.post('/:id/comentarios', asincrona(async (req, res) => {
  const resultado = await tickets.comentarTicket(
    res.locals.usuario as Usuario,
    idValido(req.params.id, 'id'),
    texto(req.body?.texto, 'texto', { max: 2000 }),
  );
  res.status(201).json(resultado);
}));

export default router;
