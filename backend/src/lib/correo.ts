// Correo del sistema (integración de plataforma, la configura Antonio una vez).
// Protocolo SMTP genérico: sirve con cualquier proveedor de correo transaccional.
// Las credenciales van en variables de entorno, nunca en el código ni en las respuestas.
import nodemailer from 'nodemailer';

// Lo mínimo que usa el servicio. Permite un transporte falso en las pruebas.
export interface TransporteCorreo {
  verify(): Promise<unknown>;
  sendMail(mensaje: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
}

export interface ConfigCorreo {
  host: string;
  puerto: number;
  usuario: string;
  contrasena: string;
  remitente: string;
}

// Lee la configuración de las variables SMTP_* y CORREO_REMITENTE. Null si falta algo.
export function configuracionCorreo(env: NodeJS.ProcessEnv = process.env): ConfigCorreo | null {
  const host = env.SMTP_HOST;
  const usuario = env.SMTP_USUARIO;
  const contrasena = env.SMTP_CONTRASENA;
  const remitente = env.CORREO_REMITENTE;
  if (!host || !usuario || !contrasena || !remitente) return null;
  // `||` y no `??`: una variable definida pero vacía cuenta como ausente (usa 587).
  const puerto = Number(env.SMTP_PUERTO || 587);
  if (!Number.isInteger(puerto) || puerto <= 0) return null;
  return { host, puerto, usuario, contrasena, remitente };
}

// Solo para pruebas: permite inyectar un transporte falso sin tocar la red.
let transporteDePrueba: TransporteCorreo | null = null;
export function usarTransporteDePrueba(t: TransporteCorreo | null) {
  transporteDePrueba = t;
}

function crearTransporte(c: ConfigCorreo): TransporteCorreo {
  if (transporteDePrueba) return transporteDePrueba;
  return nodemailer.createTransport({
    host: c.host,
    port: c.puerto,
    secure: c.puerto === 465,
    auth: { user: c.usuario, pass: c.contrasena },
  });
}

export async function estadoCorreo(): Promise<{ configurado: boolean; conexion: 'ok' | 'error' | null }> {
  const c = configuracionCorreo();
  if (!c) return { configurado: false, conexion: null };
  try {
    await crearTransporte(c).verify();
    return { configurado: true, conexion: 'ok' };
  } catch {
    // El detalle del error puede contener datos de la conexión: no se devuelve.
    return { configurado: true, conexion: 'error' };
  }
}

export async function enviarCorreo(destinatario: string, asunto: string, texto: string): Promise<void> {
  const c = configuracionCorreo();
  if (!c) throw new Error('Correo no configurado');
  await crearTransporte(c).sendMail({ from: c.remitente, to: destinatario, subject: asunto, text: texto });
}
