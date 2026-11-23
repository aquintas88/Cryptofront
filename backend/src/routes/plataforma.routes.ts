import { validarIdioma } from '../lib/idiomas';
import { Router } from 'express';
import { requiereRol, requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { email, passwordNueva, texto } from '../lib/validar';
import * as plataforma from '../services/plataforma.service';
import { ErrorApp } from '../lib/errores';
import { estadoCorreo } from '../lib/correo';
import * as correo from '../services/correo.service';

// Solo para usuarios SUPERADMIN. Alta de empresas y de su primer director.
const router = Router();
router.use(requiereSesion, requiereRol('SUPERADMIN'));

router.get('/empresas', asincrona(async (_req, res) => {
  res.json({ empresas: await plataforma.listarEmpresas() });
}));

router.post('/empresas', asincrona(async (req, res) => {
  const nombre = texto(req.body?.nombre, 'nombre', { max: 120 });
  let director: plataforma.DatosDirector | undefined;
  if (req.body?.director !== undefined) {
    const d = req.body.director;
    if (typeof d !== 'object' || d === null) throw new ErrorApp(400, 'Campo no válido: director');
    director = {
      nombre: texto(d.nombre, 'director.nombre', { max: 120 }),
      email: email(d.email),
      password: passwordNueva(d.password),
    };
  }
  const idioma = validarIdioma(req.body?.idioma);
  const resultado = await plataforma.crearEmpresa(nombre, director, idioma);
  res.status(201).json(resultado);
}));

// Cargas de datos de inversión de todas las empresas (estado y recuento; sin datos personales).
router.get('/cargas', asincrona(async (_req, res) => {
  res.json({ cargas: await plataforma.listarCargas() });
}));

// Correo del sistema: comprobar la conexión y enviar un correo de prueba.
router.get('/correo/estado', asincrona(async (_req, res) => {
  res.json(await estadoCorreo());
}));

router.post('/correo/prueba', asincrona(async (req, res) => {
  const destinatario = email(req.body?.destinatario);
  res.json(await correo.probarEnvio({ id: res.locals.usuario.id, tenantId: res.locals.usuario.tenantId }, destinatario));
}));

export default router;
