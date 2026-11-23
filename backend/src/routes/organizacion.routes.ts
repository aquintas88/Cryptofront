import { Router } from 'express';
import { requiereRol, requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { ErrorApp } from '../lib/errores';
import { listarAuditoria, ORDEN_AUDITORIA } from '../lib/auditoria';
import { leerParamsListado } from '../lib/listados';
import { booleano, email, idValido, passwordNueva, texto, textoOpcional } from '../lib/validar';
import * as org from '../services/organizacion.service';
import * as secretos from '../services/secretos.service';
import * as plantillas from '../services/plantillas.service';

// Gestión de la propia empresa. Todas las rutas filtran por el tenant del usuario autenticado.
// Módulo de organización: solo SUPERADMIN (los roles de empresa se han eliminado).
const router = Router();
router.use(requiereSesion, requiereRol('SUPERADMIN'));

function nombreValido(valor: unknown, nombre: string): string {
  const limpio = texto(valor, nombre, { max: 80 });
  if (!/^[a-z0-9_.]+$/.test(limpio)) throw new ErrorApp(400, `Campo no válido: ${nombre}`);
  return limpio;
}

function ambitoValido(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return secretos.AMBITO_EMPRESA;
  return idValido(valor, 'ambito');
}

// Sucursales
router.get('/sucursales', asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, org.ORDEN_SUCURSALES, 'nombre');
  res.json(await org.listarSucursales(res.locals.usuario.tenantId, params));
}));

router.get('/sucursales/:id', asincrona(async (req, res) => {
  res.json({ sucursal: await org.obtenerSucursal(res.locals.usuario.tenantId, idValido(req.params.id, 'id')) });
}));

router.post('/sucursales', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const sucursal = await org.crearSucursal(res.locals.usuario.tenantId, res.locals.usuario.id, {
    nombre: texto(req.body?.nombre, 'nombre', { max: 120 }),
    direccion: textoOpcional(req.body?.direccion, 'direccion', 300),
  });
  res.status(201).json({ sucursal });
}));

router.patch('/sucursales/:id', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const cambios: { nombre?: string; direccion?: string | null; activa?: boolean } = {};
  if (req.body?.nombre !== undefined) cambios.nombre = texto(req.body.nombre, 'nombre', { max: 120 });
  if (req.body?.direccion !== undefined) cambios.direccion = textoOpcional(req.body.direccion, 'direccion', 300);
  if (req.body?.activa !== undefined) cambios.activa = booleano(req.body.activa, 'activa');
  if (Object.keys(cambios).length === 0) throw new ErrorApp(400, 'Nada que cambiar');
  const sucursal = await org.actualizarSucursal(
    res.locals.usuario.tenantId,
    res.locals.usuario.id,
    idValido(req.params.id, 'id'),
    cambios,
  );
  res.json({ sucursal });
}));

// Usuarios
router.get('/usuarios', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, org.ORDEN_USUARIOS, 'nombre');
  res.json(await org.listarUsuarios(res.locals.usuario.tenantId, params));
}));

router.get('/usuarios/:id', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  res.json({ usuario: await org.obtenerUsuario(res.locals.usuario.tenantId, idValido(req.params.id, 'id')) });
}));

router.post('/usuarios', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const usuario = await org.crearUsuario(res.locals.usuario.tenantId, res.locals.usuario.id, {
    nombre: texto(req.body?.nombre, 'nombre', { max: 120 }),
    email: email(req.body?.email),
    password: passwordNueva(req.body?.password),
    rol: texto(req.body?.rol, 'rol', { max: 20 }),
    sucursalId: req.body?.sucursalId ? idValido(req.body.sucursalId, 'sucursalId') : null,
  });
  res.status(201).json({ usuario });
}));

router.patch('/usuarios/:id', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const cambios: { nombre?: string; rol?: string; activo?: boolean; sucursalId?: string | null } = {};
  if (req.body?.nombre !== undefined) cambios.nombre = texto(req.body.nombre, 'nombre', { max: 120 });
  if (req.body?.rol !== undefined) cambios.rol = texto(req.body.rol, 'rol', { max: 20 });
  if (req.body?.activo !== undefined) cambios.activo = booleano(req.body.activo, 'activo');
  if (req.body?.sucursalId !== undefined) {
    cambios.sucursalId = req.body.sucursalId ? idValido(req.body.sucursalId, 'sucursalId') : null;
  }
  if (Object.keys(cambios).length === 0) throw new ErrorApp(400, 'Nada que cambiar');
  const usuario = await org.actualizarUsuario(
    res.locals.usuario.tenantId,
    res.locals.usuario.id,
    idValido(req.params.id, 'id'),
    cambios,
  );
  res.json({ usuario });
}));

// Plantillas de documento
router.get('/plantillas', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, plantillas.ORDEN_PLANTILLAS, 'nombre');
  res.json(await plantillas.listarPlantillas(res.locals.usuario.tenantId, params));
}));

router.get('/plantillas/:id', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  res.json({ plantilla: await plantillas.obtenerPlantilla(res.locals.usuario.tenantId, idValido(req.params.id, 'id')) });
}));

router.post('/plantillas', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const plantilla = await plantillas.crearPlantilla(res.locals.usuario.tenantId, res.locals.usuario.id, {
    nombre: texto(req.body?.nombre, 'nombre', { max: 120 }),
    contenido: plantillas.validarContenido(req.body?.contenido),
  });
  res.status(201).json({ plantilla });
}));

router.patch('/plantillas/:id', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const cambios: { nombre?: string; contenido?: string } = {};
  if (req.body?.nombre !== undefined) cambios.nombre = texto(req.body.nombre, 'nombre', { max: 120 });
  if (req.body?.contenido !== undefined) cambios.contenido = plantillas.validarContenido(req.body.contenido);
  if (Object.keys(cambios).length === 0) throw new ErrorApp(400, 'Nada que cambiar');
  const plantilla = await plantillas.actualizarPlantilla(
    res.locals.usuario.tenantId,
    res.locals.usuario.id,
    idValido(req.params.id, 'id'),
    cambios,
  );
  res.json({ plantilla });
}));

router.post('/plantillas/:id/pdf', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const pdf = await plantillas.generarPdf(res.locals.usuario.tenantId, idValido(req.params.id, 'id'), req.body?.variables);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
  res.status(200).send(pdf);
}));

// Secretos de integración: solo el director. Nunca se devuelve el valor.
router.get('/secretos', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, secretos.ORDEN_SECRETOS, 'integracion');
  res.json(await secretos.listarSecretos(res.locals.usuario.tenantId, params));
}));

router.put('/secretos', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const guardado = await secretos.guardarSecreto(res.locals.usuario.tenantId, res.locals.usuario.id, {
    integracion: nombreValido(req.body?.integracion, 'integracion'),
    campo: nombreValido(req.body?.campo, 'campo'),
    ambito: ambitoValido(req.body?.ambito),
    valor: texto(req.body?.valor, 'valor', { max: 4096 }),
  });
  res.json({ secreto: guardado });
}));

router.delete('/secretos', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const resultado = await secretos.eliminarSecreto(res.locals.usuario.tenantId, res.locals.usuario.id, {
    integracion: nombreValido(req.body?.integracion, 'integracion'),
    campo: nombreValido(req.body?.campo, 'campo'),
    ambito: ambitoValido(req.body?.ambito),
  });
  res.json(resultado);
}));

// Auditoría de la empresa: solo el director, más reciente primero.
router.get('/auditoria', requiereRol('SUPERADMIN'), asincrona(async (req, res) => {
  const params = leerParamsListado(req.query, ORDEN_AUDITORIA, 'creadoEn', 'desc');
  res.json(await listarAuditoria(res.locals.usuario.tenantId, params));
}));

export default router;
