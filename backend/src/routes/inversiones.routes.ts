import { Router } from 'express';
import { requiereRol, requiereSesion } from '../middleware/sesion';
import { asincrona } from '../lib/asincrona';
import { ErrorApp } from '../lib/errores';
import * as inv from '../services/inversiones.service';

// Zona de inversores (INVERSOR). Aislamiento: RLS en Postgres.
const router = Router();
router.use(requiereSesion);

const PRODUCTOS = ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'] as const;
const PERIODOS = ['6m', '1a', 'todo'] as const;

router.get('/resumen', requiereRol('INVERSOR'), asincrona(async (_req, res) => {
  res.json(await inv.resumenInversor(res.locals.usuario));
}));

router.get('/serie', requiereRol('INVERSOR'), asincrona(async (req, res) => {
  const producto = req.query.producto ?? null;
  if (producto !== null && !(PRODUCTOS as readonly string[]).includes(String(producto))) {
    throw new ErrorApp(400, 'Producto no válido');
  }
  const periodo = (req.query.periodo ?? '1a') as string;
  if (!(PERIODOS as readonly string[]).includes(periodo)) throw new ErrorApp(400, 'Periodo no válido');
  res.json({
    datos: await inv.serieInversor(res.locals.usuario, producto as inv.ProductoPublico | null, periodo as '6m' | '1a' | 'todo'),
  });
}));

router.get('/movimientos', requiereRol('INVERSOR'), asincrona(async (req, res) => {
  const limite = Math.min(Math.max(Number(req.query.limite ?? 20) || 20, 1), 1000);
  res.json({ datos: await inv.movimientosInversor(res.locals.usuario, limite) });
}));

router.get('/rentabilidad', requiereRol('INVERSOR'), asincrona(async (_req, res) => {
  res.json(await inv.rentabilidadInversor(res.locals.usuario));
}));

export default router;
