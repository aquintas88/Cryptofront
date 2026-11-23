// Crea (o actualiza) un usuario SUPERADMIN. Se ejecuta una vez, con un usuario administrador de la base de datos.
// La contraseña se pasa por variable de entorno, nunca por argumento de línea de comandos.
//
// Uso (desde backend/):
//   PLATAFORMA_EMAIL=... PLATAFORMA_NOMBRE=... PLATAFORMA_PASSWORD=... \
//   DATABASE_URL=<conexión de administrador> npx tsx scripts/crear-plataforma.ts
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/criptografia';

async function main() {
  const email = process.env.PLATAFORMA_EMAIL?.trim().toLowerCase();
  const nombre = process.env.PLATAFORMA_NOMBRE?.trim();
  const password = process.env.PLATAFORMA_PASSWORD;
  if (!email || !nombre || !password || password.length < 12) {
    throw new Error('Faltan PLATAFORMA_EMAIL, PLATAFORMA_NOMBRE o PLATAFORMA_PASSWORD (mínimo 12 caracteres)');
  }

  const empresa =
    (await prisma.tenant.findFirst({ where: { esPlataforma: true } })) ??
    (await prisma.tenant.create({ data: { nombre: 'Plataforma', esPlataforma: true } }));

  await prisma.usuario.upsert({
    where: { email },
    update: { rol: 'SUPERADMIN', activo: true, passwordHash: hashPassword(password), tenantId: empresa.id },
    create: { email, nombre, rol: 'SUPERADMIN', passwordHash: hashPassword(password), tenantId: empresa.id },
  });
  console.log('Usuario SUPERADMIN preparado (email no mostrado en este registro).');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Error desconocido');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
