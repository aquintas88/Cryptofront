import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ErrorApp } from './lib/errores';
import authRouter from './routes/auth.routes';
import plataformaRouter from './routes/plataforma.routes';
import inversionesRouter from './routes/inversiones.routes';
import organizacionRouter from './routes/organizacion.routes';
import alertasRouter from './routes/alertas.routes';
import ticketsRouter from './routes/tickets.routes';
import agendaRouter from './routes/agenda.routes';
import ayudaRouter, { novedades as novedadesRouter } from './routes/ayuda.routes';

export interface OpcionesApp {
  // Intentos de autenticación por IP en 15 minutos. Las pruebas bajan el valor para verificar el límite.
  limiteAuth?: number;
}

// Crea la aplicación Express sin arrancar el servidor (así se puede probar con supertest).
export function crearApp(opciones: OpcionesApp = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Railway envía las peticiones a través de un proxy: el límite de intentos debe contar la IP real del cliente.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', servicio: 'cryptofront-backend' });
  });

  const limiteAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: opciones.limiteAuth ?? 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Inténtalo más tarde.' },
  });
  app.use('/api/auth', limiteAuth, authRouter);
  app.use('/api/plataforma', plataformaRouter);
  app.use('/api/inversiones', inversionesRouter);
  app.use('/api/organizacion', organizacionRouter);
  app.use('/api/alertas', alertasRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/agenda', agendaRouter);
  app.use('/api/ayuda', ayudaRouter);
  app.use('/api/novedades', novedadesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'No encontrado' });
  });

  // Manejador de errores: los ErrorApp llevan mensaje seguro; cualquier otro error no se revela.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ErrorApp) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'JSON no válido' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });

  return app;
}
