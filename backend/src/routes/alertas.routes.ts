import { Router } from 'express';
import { requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { leerParamsListado } from '../lib/listados';
import { idValido } from '../lib/validar';
import * as alertas from '../services/alertas.service';
import { Usuario } from '../services/contexto';

const router = Router();
router.use(requiereSesion);

router.get('/', asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, alertas.ORDEN_ALERTAS, 'creadaEn', 'desc');
  res.json(await alertas.listarAlertas(res.locals.usuario as Usuario, params));
}));

router.post('/:id/resolver', asincrona(async (req, res) => {
  res.json({ alerta: await alertas.resolverAlerta(res.locals.usuario as Usuario, idValido(req.params.id, 'id')) });
}));

export default router;
