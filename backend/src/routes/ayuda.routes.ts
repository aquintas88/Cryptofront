import { Router } from 'express';
import { requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { ErrorApp } from '../lib/errores';
import { idValido } from '../lib/validar';
import { ARTICULOS } from '../datos/ayuda';
import { CHANGELOG, VERSION_ACTUAL } from '../datos/changelog';

// Centro de ayuda y novedades. Solo lectura; el contenido vive en src/datos.
const ayuda = Router();
ayuda.use(requiereSesion);

ayuda.get('/', asincrona(async (_req, res) => {
  res.json({ articulos: ARTICULOS.map(({ id, categoria, titulo }) => ({ id, categoria, titulo })) });
}));

ayuda.get('/:id', asincrona(async (req, res) => {
  const id = idValido(req.params.id, 'id');
  const articulo = ARTICULOS.find((a) => a.id === id);
  if (!articulo) throw new ErrorApp(404, 'No encontrado');
  res.json({ articulo });
}));

export const novedades = Router();
novedades.use(requiereSesion);

novedades.get('/', asincrona(async (_req, res) => {
  res.json({ versionActual: VERSION_ACTUAL, novedades: CHANGELOG });
}));

export default ayuda;
