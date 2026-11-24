// Datos de PRUEBA: historial de cargas semanales y cuenta de SUPERADMIN de plataforma (solo PRE y local).
// Uso: SEED_PASSWORD=... npx tsx scripts/seed-cargas-prueba.ts
// Idempotente: no duplica cargas ni cuentas que ya existan.
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/criptografia';

const DIA = 86_400_000;

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('Define SEED_PASSWORD (mínimo 12 caracteres)');

  const empresa = await prisma.tenant.findFirst({ where: { nombre: 'Cryptofront' } });
  if (!empresa) throw new Error('Falta la empresa de pruebas: ejecuta antes el seed de inversiones');
  if ((await prisma.cargaInversion.count({ where: { tenantId: empresa.id } })) === 0) {
    const primerLunes = Date.UTC(2025, 0, 6, 0, 30);
    const ultimo = Date.UTC(2026, 10, 23, 0, 30);
    const datos = [];
    for (let t = primerLunes, n = 0; t <= ultimo; t += 7 * DIA, n++) {
      const incidencia = new Date(t).toISOString().slice(0, 10) === '2026-06-15' || new Date(t).toISOString().slice(0, 10) === '2025-09-22';
      datos.push({
        tenantId: empresa.id,
        fechaCarga: new Date(t),
        origen: 'Sistema de inversión (exportación semanal)',
        estado: incidencia ? 'ERROR' : 'OK',
        filasRecibidas: 1200 + n * 9,
        filasAceptadas: incidencia ? 0 : 1200 + n * 9,
        erroresResumen: incidencia ? 'Fichero incompleto: no se recibió la columna de fecha' : null,
      });
    }
    await prisma.cargaInversion.createMany({ data: datos });
    console.log(`Cargas creadas: ${datos.length}`);
  } else {
    console.log('Las cargas de la empresa de pruebas ya existen.');
  }

  let plataforma = await prisma.tenant.findFirst({ where: { esPlataforma: true } });
  if (!plataforma) plataforma = await prisma.tenant.create({ data: { nombre: 'Plataforma (pruebas)', esPlataforma: true } });
  if (!(await prisma.usuario.findUnique({ where: { email: 'superadmin@ejemplo.test' } }))) {
    await prisma.usuario.create({
      data: { tenantId: plataforma.id, email: 'superadmin@ejemplo.test', nombre: 'Superadmin de pruebas', rol: 'SUPERADMIN', passwordHash: hashPassword(password) },
    });
    console.log('Creado: superadmin@ejemplo.test (SUPERADMIN)');
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
