// Datos de PRUEBA para la zona de inversores. Solo para entornos PRE y local.
// Todo es ficticio: emails @ejemplo.test, nombres genéricos y montos inventados.
// Uso: SEED_PASSWORD=... npx tsx scripts/seed-pruebas-inversiones.ts
// Idempotente: si la empresa de pruebas ya existe, no hace nada.
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/criptografia';
import { conContextoRls } from '../src/lib/contexto-rls';

const NOMBRE_EMPRESA = 'Cryptofront (pruebas)';
const INICIO = new Date(Date.UTC(2026, 0, 1));
const HOY = new Date(Date.UTC(2026, 10, 21));
const DIA = 86_400_000;

// Generador determinista (mulberry32): mismos datos en cada ejecución.
function generador(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
const redondear = (n: number) => Math.round(n * 100) / 100;
const fechaUTC = (t: number) => new Date(t);
const fin = (d: Date) => d.toISOString().slice(0, 10);

// Qué productos tiene cada inversor de prueba (variado a propósito).
const CARTERAS: Record<number, ('BOT_TRADING' | 'PROYECTO_CRYPTO' | 'TOKEN_SHARE')[]> = {
  1: ['BOT_TRADING', 'PROYECTO_CRYPTO'],
  2: ['BOT_TRADING', 'TOKEN_SHARE'],
  3: ['BOT_TRADING'],
  4: ['PROYECTO_CRYPTO', 'TOKEN_SHARE'],
  5: ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'],
  6: ['BOT_TRADING'],
  7: ['TOKEN_SHARE'],
  8: ['PROYECTO_CRYPTO'],
  9: ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'],
  10: ['BOT_TRADING'],
};

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('Define SEED_PASSWORD (mínimo 12 caracteres)');

  if (await prisma.tenant.findFirst({ where: { nombre: NOMBRE_EMPRESA } })) {
    console.log('La empresa de pruebas ya existe. No se modifica nada.');
    return;
  }

  const tenant = await prisma.tenant.create({ data: { nombre: NOMBRE_EMPRESA } });
  const hash = hashPassword(password);
  const gestor = await prisma.usuario.create({
    data: { tenantId: tenant.id, email: 'gestor@ejemplo.test', nombre: 'Gestor de pruebas', rol: 'DIRECTOR_EMPRESA', passwordHash: hash },
  });
  const inversores = [];
  for (let i = 1; i <= 10; i++) {
    const n = String(i).padStart(2, '0');
    inversores.push(await prisma.usuario.create({
      data: { tenantId: tenant.id, email: `inversor${n}@ejemplo.test`, nombre: `Inversor de prueba ${n}`, rol: 'INVERSOR', passwordHash: hash },
    }));
  }

  const ctx = { id: gestor.id, tenantId: tenant.id, rol: 'DIRECTOR_EMPRESA' };
  await conContextoRls(ctx, async (tx) => {
    // Condiciones vigentes: comisión de éxito del bot (general) y condiciones de cada producto.
    await tx.condicionesInversion.create({
      data: { tenantId: tenant.id, producto: 'BOT_TRADING', vigenteDesde: INICIO, comisionExitoPct: 20 },
    });

    let contador = 0;
    for (const [indice, productos] of Object.entries(CARTERAS)) {
      const i = Number(indice);
      const r = generador(1000 + i);
      const inversor = inversores[i - 1];
      for (const producto of productos) {
        const alta = fechaUTC(INICIO.getTime() + Math.floor(r() * 60) * DIA + (i % 3) * DIA);
        const capital = producto === 'BOT_TRADING' ? 5000 + Math.floor(r() * 25) * 1000 : 3000 + Math.floor(r() * 10) * 1000;
        const posicion = await tx.posicionInversion.create({
          data: {
            tenantId: tenant.id, inversorId: inversor.id, producto, fechaAlta: alta,
            capitalAportado: capital, idOrigen: `prueba-${i}-${producto}`,
            estado: 'ACTIVA',
          },
        });
        const movs: { tipo: 'APORTACION' | 'RETIRADA' | 'COMISION' | 'RENDIMIENTO' | 'REPARTO'; importe: number; fecha: Date }[] = [
          { tipo: 'APORTACION', importe: capital, fecha: alta },
        ];
        const base = { tenantId: tenant.id, posicionId: posicion.id, inversorId: inversor.id };
        const escribirMovs = async () => {
          for (const m of movs) {
            contador += 1;
            await tx.movimientoInversion.create({ data: { ...base, ...m, idOrigen: `prueba-${contador}` } });
          }
        };

        if (producto === 'BOT_TRADING') {
          // Valor diario con rentabilidad aleatoria; comisión de éxito del 20 % sobre la ganancia del mes.
          let valor = capital;
          let mesActual = alta.getUTCMonth();
          let valorInicioMes = capital;
          const valores: { fecha: Date; valor: number }[] = [];
          for (let t = +alta; t <= +HOY; t += DIA) {
            const d = fechaUTC(t);
            valor = valor * (1 + 0.0009 + 0.0065 * normal(r));
            // Aportación extra del inversor 1 y retirada del inversor 3 (variedad de histórico).
            if (i === 1 && fin(d) === '2026-07-10') {
              valor += 3000;
              movs.push({ tipo: 'APORTACION', importe: 3000, fecha: d });
            }
            if (i === 3 && fin(d) === '2026-09-01') {
              valor -= 1500;
              movs.push({ tipo: 'RETIRADA', importe: 1500, fecha: d });
            }
            const siguiente = fechaUTC(t + DIA);
            if (siguiente.getUTCMonth() !== d.getUTCMonth() || t + DIA > +HOY) {
              const ganancia = valor - valorInicioMes;
              if (ganancia > 0) {
                const comision = redondear(ganancia * 0.2);
                valor -= comision;
                movs.push({ tipo: 'COMISION', importe: comision, fecha: d });
              }
              valorInicioMes = valor;
              mesActual = siguiente.getUTCMonth();
            }
            valores.push({ fecha: d, valor: redondear(valor) });
          }
          void mesActual;
          await tx.valorDiarioInversion.createMany({
            data: valores.map((v) => ({
              ...base, fecha: new Date(Date.UTC(v.fecha.getUTCFullYear(), v.fecha.getUTCMonth(), v.fecha.getUTCDate())),
              valor: v.valor, idOrigen: `val-${posicion.id}-${fin(v.fecha)}`,
            })),
          });
          await escribirMovs();
        } else if (producto === 'PROYECTO_CRYPTO') {
          const tasa = 0.25 + Math.floor(r() * 4) * 0.05;
          const salida = i % 2 === 0 ? new Date(Date.UTC(2026, 7, 31)) : new Date(Date.UTC(2027, 2, 31));
          await tx.condicionesInversion.create({
            data: { tenantId: tenant.id, producto, vigenteDesde: alta, tasaFijaPct: redondear(tasa * 100), fechaSalida: salida },
          });
          if (salida <= HOY) {
            movs.push({ tipo: 'RENDIMIENTO', importe: redondear(capital * tasa), fecha: salida });
            await tx.posicionInversion.update({ where: { id: posicion.id }, data: { estado: 'FINALIZADA', fechaBaja: salida } });
          }
          await escribirMovs();
        } else {
          const tasaMensual = 0.012 + Math.floor(r() * 4) * 0.003;
          await tx.condicionesInversion.create({
            data: { tenantId: tenant.id, producto, vigenteDesde: alta, tasaMensualPct: redondear(tasaMensual * 100), meses: 12 },
          });
          for (let m = 1; m <= 12; m++) {
            const fecha = new Date(Date.UTC(alta.getUTCFullYear(), alta.getUTCMonth() + m, alta.getUTCDate()));
            if (fecha > HOY) break;
            movs.push({ tipo: 'REPARTO', importe: redondear(capital * tasaMensual), fecha });
          }
          await escribirMovs();
        }
      }
    }
  });

  console.log(`Creado: empresa "${NOMBRE_EMPRESA}", 1 gestor, 10 inversores de prueba (inversor01..10@ejemplo.test).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
