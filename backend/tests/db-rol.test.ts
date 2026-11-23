import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Lección L-09 y decisión D-03: la app NO debe conectar con un rol superusuario,
// porque un superusuario salta RLS siempre. Esta prueba falla si lo hace.
// Solo corre si hay DATABASE_URL (en CI y en local con la base de datos levantada).
const conBD = Boolean(process.env.DATABASE_URL);

describe.skipIf(!conBD)('rol de base de datos', () => {
  const prisma = new PrismaClient();
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('la conexión de la app no es superusuario', async () => {
    const [fila] = await prisma.$queryRaw<{ rolsuper: boolean }[]>`
      SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
    expect(fila?.rolsuper).toBe(false);
  });

  it('las migraciones están aplicadas (tabla Tenant existe)', async () => {
    const [fila] = await prisma.$queryRaw<{ existe: boolean }[]>`
      SELECT to_regclass('public."Tenant"') IS NOT NULL AS existe`;
    expect(fila?.existe).toBe(true);
  });
});
