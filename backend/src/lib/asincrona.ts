import { NextFunction, Request, Response } from 'express';

// Express 4 no captura errores de funciones async: los reenvía al manejador de errores.
// Además, marca la respuesta como no cacheable (datos de sesión y de cuentas).
export function asincrona(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    fn(req, res).catch(next);
  };
}
