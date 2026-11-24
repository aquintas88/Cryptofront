// Borra la empresa de pruebas «Cryptofront» con sus inversores, posiciones, movimientos, valores y cargas.
// Las cuentas SUPERADMIN que estén dentro se mueven a la empresa de plataforma antes de borrar.
// Solo PRE y local. Requiere confirmación explícita: CONFIRMAR_BORRADO=si
// Uso: DATABASE_URL=<admin> CONFIRMAR_BORRADO=si npx tsx scripts/reset-pruebas.ts
import { prisma } from '../src/lib/prisma';

const NOMBRE = 'Cryptofront';

async function main() {
  if (process.env.CONFIRMAR_BORRADO !== 'si') throw new Error('Borrado no confirmado. Define CONFIRMAR_BORRADO=si');
  const empresa = await prisma.tenant.findFirst({ where: { nombre: NOMBRE, esPlataforma: false } });
  if (!empresa) {
    console.log(`No existe la empresa "${NOMBRE}". Nada que borrar.`);
    return;
  }
  const plataforma = await prisma.tenant.findFirst({ where: { esPlataforma: true } });
  if (!plataforma) throw new Error('Falta la empresa de plataforma');

  await prisma.$transaction(async (tx) => {
    const movidos = await tx.usuario.updateMany({ where: { tenantId: empresa.id, rol: 'SUPERADMIN' }, data: { tenantId: plataforma.id } });
    const usuarios = await tx.usuario.findMany({ where: { tenantId: empresa.id }, select: { id: true } });
    const ids = usuarios.map((u) => u.id);
    const mov = await tx.movimientoInversion.deleteMany({ where: { tenantId: empresa.id } });
    const val = await tx.valorDiarioInversion.deleteMany({ where: { tenantId: empresa.id } });
    const pos = await tx.posicionInversion.deleteMany({ where: { tenantId: empresa.id } });
    const cond = await tx.condicionesInversion.deleteMany({ where: { tenantId: empresa.id } });
    const cargas = await tx.cargaInversion.deleteMany({ where: { tenantId: empresa.id } });
    const sesiones = await tx.sesionRefresco.deleteMany({ where: { usuarioId: { in: ids } } });
    const usr = await tx.usuario.deleteMany({ where: { tenantId: empresa.id } });
    await tx.tenant.delete({ where: { id: empresa.id } });
    console.log(JSON.stringify({ superadminMovidos: movidos.count, movimientos: mov.count, valores: val.count, posiciones: pos.count, condiciones: cond.count, cargas: cargas.count, sesiones: sesiones.count, usuarios: usr.count, empresa: 'borrada' }));
  });
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
