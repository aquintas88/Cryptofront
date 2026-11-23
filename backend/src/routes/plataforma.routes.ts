import { validarIdioma } from '../lib/idiomas';
import { Router } from 'express';
import { requiereRol, requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { email, passwordNueva, texto } from '../lib/validar';
import * as plataforma from '../services/plataforma.service';
import { ErrorApp } from '../lib/errores';
import { estadoCorreo } from '../lib/correo';
import * as correo from '../services/correo.service';
import * as cuentas from '../services/usuarios-plataforma.service';

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

// Usuarios de todas las empresas: alta, edición, claves temporales, bloqueos y sesiones.
router.get('/usuarios', asincrona(async (req, res) => {
  const q = req.query;
  const estado = q.estado === 'activo' || q.estado === 'inactivo' || q.estado === 'bloqueado' ? q.estado : undefined;
  res.json({
    usuarios: await cuentas.listarUsuarios({
      tenantId: typeof q.tenantId === 'string' ? q.tenantId : undefined,
      rol: typeof q.rol === 'string' ? q.rol : undefined,
      estado,
      q: typeof q.q === 'string' ? q.q.slice(0, 100) : undefined,
    }),
  });
}));

router.post('/usuarios', asincrona(async (req, res) => {
  const resultado = await cuentas.crearUsuario(res.locals.usuario.id, {
    email: email(req.body?.email),
    nombre: texto(req.body?.nombre, 'nombre', { max: 120 }),
    rol: req.body?.rol,
    tenantId: texto(req.body?.tenantId, 'tenantId', { max: 64 }),
  });
  res.status(201).json(resultado);
}));

router.get('/usuarios/:id', asincrona(async (req, res) => {
  res.json({ usuario: await cuentas.detalleUsuario(req.params.id) });
}));

router.patch('/usuarios/:id', asincrona(async (req, res) => {
  res.json({ usuario: await cuentas.editarUsuario(res.locals.usuario.id, req.params.id, req.body ?? {}) });
}));

router.post('/usuarios/:id/restablecer-clave', asincrona(async (req, res) => {
  res.json(await cuentas.restablecerClave(res.locals.usuario.id, req.params.id));
}));

router.post('/usuarios/:id/desbloquear', asincrona(async (req, res) => {
  await cuentas.desbloquear(res.locals.usuario.id, req.params.id);
  res.status(204).end();
}));

router.post('/usuarios/:id/cerrar-sesiones', asincrona(async (req, res) => {
  res.json(await cuentas.cerrarSesiones(res.locals.usuario.id, req.params.id));
}));

// Ficha de inversor: posiciones, movimientos y correcciones.
router.get('/usuarios/:id/ficha', asincrona(async (req, res) => {
  res.json(await cuentas.fichaInversor(res.locals.usuario.id, req.params.id));
}));

router.post('/usuarios/:id/movimientos', asincrona(async (req, res) => {
  res.status(201).json({ movimiento: await cuentas.crearMovimiento(res.locals.usuario.id, req.params.id, req.body ?? {}) });
}));

router.patch('/usuarios/:id/movimientos/:movId', asincrona(async (req, res) => {
  res.json({ movimiento: await cuentas.corregirMovimiento(res.locals.usuario.id, req.params.id, req.params.movId, req.body ?? {}) });
}));

// Auditoría de la plataforma, con filtros.
router.get('/auditoria', asincrona(async (req, res) => {
  const q = req.query;
  const fecha = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v) : undefined);
  const hasta = fecha(q.hasta);
  res.json({
    registros: await cuentas.listarAuditoria({
      entidad: typeof q.entidad === 'string' ? q.entidad.slice(0, 60) : undefined,
      accion: typeof q.accion === 'string' ? q.accion.slice(0, 20) : undefined,
      actorId: typeof q.actorId === 'string' ? q.actorId.slice(0, 64) : undefined,
      tenantId: typeof q.tenantId === 'string' ? q.tenantId.slice(0, 64) : undefined,
      desde: fecha(q.desde),
      hasta: hasta ? new Date(hasta.getTime() + 86_400_000 - 1) : undefined,
    }),
  });
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
