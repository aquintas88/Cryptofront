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
import * as inv from '../services/inversiones.service';
import { prisma } from '../lib/prisma';
import { registrarAuditoria } from '../lib/auditoria';

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
      estado: q.estado === 'todos' ? 'todos' : estado,
      dosFactores: q.dosFactores === 'si' ? true : q.dosFactores === 'no' ? false : undefined,
      claveTemporal: q.claveTemporal === 'si' ? true : q.claveTemporal === 'no' ? false : undefined,
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

// Filtros de la auditoría: «hasta» incluye el día completo.
function filtrosAuditoria(q: Record<string, unknown>) {
  const fecha = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v) : undefined);
  const hasta = fecha(q.hasta);
  return {
    entidad: typeof q.entidad === 'string' ? q.entidad.slice(0, 60) : undefined,
    accion: typeof q.accion === 'string' ? q.accion.slice(0, 20) : undefined,
    actorId: typeof q.actorId === 'string' ? q.actorId.slice(0, 64) : undefined,
    tenantId: typeof q.tenantId === 'string' ? q.tenantId.slice(0, 64) : undefined,
    desde: fecha(q.desde),
    hasta: hasta ? new Date(hasta.getTime() + 86_400_000 - 1) : undefined,
  };
}

// Auditoría de la plataforma, con filtros.
router.get('/auditoria', asincrona(async (req, res) => {
  res.json({ registros: await cuentas.listarAuditoria(filtrosAuditoria(req.query)) });
}));

// Exportación a Excel con los mismos filtros.
router.get('/auditoria/excel', asincrona(async (req, res) => {
  const buffer = await cuentas.exportarAuditoriaXlsx(res.locals.usuario.id, res.locals.usuario.tenantId, filtrosAuditoria(req.query));
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', 'attachment; filename="auditoria-cryptofront.xlsx"');
  res.send(buffer);
}));

// Panel de inversiones de la plataforma: el mismo panel que ve el inversor, por empresa,
// acumulado (sin inversor) o filtrado por un inversor. Cada consulta de un inversor concreto queda auditada.
async function contextoPanel(req: { query: Record<string, unknown> }, actorId: string) {
  const empresaId = typeof req.query.empresa === 'string' ? req.query.empresa : '';
  const empresa = await prisma.tenant.findFirst({ where: { id: empresaId, esPlataforma: false } });
  if (!empresa) throw new ErrorApp(400, 'Empresa no válida');
  const inversorId = typeof req.query.inversor === 'string' && req.query.inversor ? req.query.inversor : null;
  if (inversorId) {
    const ok = await prisma.usuario.findFirst({ where: { id: inversorId, tenantId: empresa.id, rol: 'INVERSOR' }, select: { id: true } });
    if (!ok) throw new ErrorApp(400, 'Inversor no válido para esa empresa');
  }
  return { ctx: { id: actorId, tenantId: empresa.id, rol: 'SUPERADMIN' }, inversorId, tenantId: empresa.id };
}

router.get('/panel/resumen-inversores', asincrona(async (req, res) => {
  const empresaId = typeof req.query.empresa === 'string' ? req.query.empresa : '';
  const empresa = await prisma.tenant.findFirst({ where: { id: empresaId, esPlataforma: false } });
  if (!empresa) throw new ErrorApp(400, 'Empresa no válida');
  res.json(await cuentas.resumenInversores(res.locals.usuario.id, empresa.id));
}));

router.get('/panel/inversores', asincrona(async (req, res) => {
  const empresaId = typeof req.query.empresa === 'string' ? req.query.empresa : '';
  const lista = await prisma.usuario.findMany({
    where: { tenantId: empresaId, rol: 'INVERSOR' },
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    select: { id: true, nombre: true, email: true, activo: true },
  });
  res.json({ inversores: lista });
}));

router.get('/panel/resumen', asincrona(async (req, res) => {
  const { ctx, inversorId } = await contextoPanel(req, res.locals.usuario.id);
  if (inversorId) {
    await prisma.$transaction((tx) => registrarAuditoria(tx, {
      tenantId: ctx.tenantId, actorId: ctx.id, entidad: 'Usuario', entidadId: inversorId, accion: 'EVENTO',
      cambios: { evento: 'consulta del panel de inversor' },
    }));
  }
  res.json(await inv.resumenInversor(ctx, inversorId));
}));

router.get('/panel/serie', asincrona(async (req, res) => {
  const { ctx, inversorId } = await contextoPanel(req, res.locals.usuario.id);
  const producto = req.query.producto ? String(req.query.producto) : null;
  const periodo = String(req.query.periodo ?? '1a');
  if (!['6m', '1a', 'todo'].includes(periodo)) throw new ErrorApp(400, 'Periodo no válido');
  res.json({ datos: await inv.serieInversor(ctx, producto as inv.ProductoPublico | null, periodo as '6m' | '1a' | 'todo', inversorId) });
}));

router.get('/panel/movimientos', asincrona(async (req, res) => {
  const { ctx, inversorId } = await contextoPanel(req, res.locals.usuario.id);
  const limite = Math.min(Math.max(Number(req.query.limite ?? 20) || 20, 1), 1000);
  res.json({ datos: await inv.movimientosInversor(ctx, limite, inversorId) });
}));

router.get('/panel/rentabilidad', asincrona(async (req, res) => {
  const { ctx, inversorId } = await contextoPanel(req, res.locals.usuario.id);
  res.json(await inv.rentabilidadInversor(ctx, inversorId));
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
