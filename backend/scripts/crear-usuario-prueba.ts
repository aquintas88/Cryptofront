// Crea un usuario de PRUEBA en la empresa de pruebas, con la contraseña de SEED_PASSWORD.
// Uso: SEED_PASSWORD=... npx tsx scripts/crear-usuario-prueba.ts email rol
// Solo para PRE y local. No modifica usuarios que ya existan.
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/criptografia';

async function main() {
  const [email, rol] = process.argv.slice(2);
  const password = process.env.SEED_PASSWORD;
  if (!email || !rol || !password || password.length < 12) throw new Error('Uso: SEED_PASSWORD=... crear-usuario-prueba.ts email rol');
  const empresa = await prisma.tenant.findFirst({ where: { nombre: 'Cryptofront (pruebas)' } });
  if (!empresa) throw new Error('No existe la empresa de pruebas: ejecuta antes el seed');
  if (await prisma.usuario.findUnique({ where: { email } })) {
    console.log(`Ya existe: ${email}`);
    return;
  }
  await prisma.usuario.create({
    data: { tenantId: empresa.id, email, nombre: 'Usuario de prueba', rol: rol as 'SUPERADMIN', passwordHash: hashPassword(password) },
  });
  console.log(`Creado: ${email} (${rol})`);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
