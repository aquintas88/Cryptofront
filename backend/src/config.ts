// Configuración desde variables de entorno. Falla al arrancar si falta algo esencial
// (lección L-06: nunca usar un secreto por defecto).
// Solo se documentan nombres de variables; los valores van en Railway o en un .env local ignorado por git.

export interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  // Clave de 32 bytes en base64 para cifrar secretos en reposo (AES-256-GCM).
  secretsMasterKey: Buffer;
  frontendUrl: string | null;
}

export function cargarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta DATABASE_URL');

  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET ausente o demasiado corto (mínimo 32 caracteres)');
  }

  const claveB64 = env.SECRETS_MASTER_KEY;
  if (!claveB64) throw new Error('Falta SECRETS_MASTER_KEY');
  const secretsMasterKey = Buffer.from(claveB64, 'base64');
  if (secretsMasterKey.length !== 32) {
    throw new Error('SECRETS_MASTER_KEY debe ser 32 bytes en base64');
  }

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) throw new Error('PORT no válido');

  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port,
    databaseUrl,
    jwtSecret,
    secretsMasterKey,
    frontendUrl: env.FRONTEND_URL ?? null,
  };
}
