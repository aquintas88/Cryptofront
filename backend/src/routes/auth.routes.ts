import { NextFunction, Request, Response, Router } from 'express';
import { ErrorApp } from '../lib/errores';
import { requiereSesion } from '../middleware/sesion';
import * as auth from '../services/auth.service';

const router = Router();

function texto(valor: unknown, nombre: string, max = 200): string {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > max) {
    throw new ErrorApp(400, `Campo no válido: ${nombre}`);
  }
  return valor;
}

function codigo(valor: unknown): string {
  if (typeof valor !== 'string' || !/^\d{6}$/.test(valor)) throw new ErrorApp(400, 'Código no válido');
  return valor;
}

function asincrona(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    fn(req, res).catch(next);
  };
}

router.post('/login', asincrona(async (req, res) => {
  const email = texto(req.body?.email, 'email', 254);
  const password = texto(req.body?.password, 'password', 200);
  res.json(await auth.login(email, password));
}));

router.post('/2fa/verificar', asincrona(async (req, res) => {
  const preToken = texto(req.body?.preToken, 'preToken', 2000);
  res.json(await auth.verificarDosFactores(preToken, codigo(req.body?.codigo)));
}));

router.post('/refrescar', asincrona(async (req, res) => {
  const refreshToken = texto(req.body?.refreshToken, 'refreshToken', 200);
  res.json(await auth.refrescar(refreshToken));
}));

router.post('/salir', asincrona(async (req, res) => {
  const refreshToken = texto(req.body?.refreshToken, 'refreshToken', 200);
  await auth.cerrarSesion(refreshToken);
  res.status(204).end();
}));

router.get('/yo', requiereSesion, asincrona(async (_req, res) => {
  const usuario = await auth.obtenerUsuario(res.locals.usuario.id);
  if (!usuario) throw new ErrorApp(401, 'Sesión no válida');
  res.json({ usuario });
}));

router.post('/2fa/configurar', requiereSesion, asincrona(async (_req, res) => {
  res.json(await auth.configurar2FA(res.locals.usuario.id));
}));

router.post('/2fa/activar', requiereSesion, asincrona(async (req, res) => {
  res.json(await auth.activar2FA(res.locals.usuario.id, codigo(req.body?.codigo)));
}));

export default router;
