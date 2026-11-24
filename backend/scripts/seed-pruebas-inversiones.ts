// Datos de PRUEBA para la zona de inversores. Solo para entornos PRE y local.
// Todo es ficticio: emails @ejemplo.test, nombres inventados y montos de prueba.
// Histórico desde enero de 2025 con 30 inversores, carteras variadas, aportaciones, retiradas,
// altas y bajas escalonadas.
// Uso: SEED_PASSWORD=... npx tsx scripts/seed-pruebas-inversiones.ts
// Idempotente: si la empresa ya existe, no hace nada (para rehacer: scripts/reset-pruebas.ts).
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/criptografia';
import { conContextoRls } from '../src/lib/contexto-rls';

const NOMBRE_EMPRESA = 'Cryptofront';
const INICIO = new Date(Date.UTC(2025, 0, 1));
const HOY = new Date(Date.UTC(2026, 10, 24));
const DIA = 86_400_000;
const N_INVERSORES = 300;

const NOMBRES_PILA = ['Lucía', 'Javier', 'Carmen', 'Miguel Ángel', 'Elena', 'David', 'Ana Belén', 'Pablo', 'Marta', 'Raúl', 'Sofía', 'Alberto', 'Irene', 'Sergio', 'Patricia', 'Jorge', 'Laura', 'Daniel', 'Nuria', 'Francisco', 'Beatriz', 'Adrián', 'Rocío', 'Héctor', 'Cristina', 'Óscar', 'Silvia', 'Mario', 'Teresa', 'Iván'];
const APELLIDOS = ['Martín Ortega', 'Gómez Ruiz', 'Sánchez Vidal', 'Torres Campos', 'Navarro Blanco', 'Romero Prieto', 'Castro Lozano', 'Herrera Peña', 'Iglesias Serrano', 'Delgado Ibáñez', 'Fuentes Moya', 'Ortiz Cano', 'Molina Rey', 'Vega Santos', 'Domínguez Luna', 'Ramos Esteban', 'Medina Garrido', 'Cortés Aguilar', 'Pascual Ríos', 'Caballero Soto', 'Lorenzo Pardo', 'Gil Montero', 'Vázquez Soler', 'Maldonado Bravo', 'Roldán Ferrer', 'Benítez Alonso', 'Hidalgo Quintana', 'Cabrera Moreno', 'Santiago Varela', 'Ferrero Núñez'];
// 30 nombres de pila × 30 apellidos = 900 combinaciones; se toman 300 de forma determinista.
const NOMBRES: string[] = Array.from({ length: N_INVERSORES }, (_, k) =>
  `${NOMBRES_PILA[k % NOMBRES_PILA.length]} ${APELLIDOS[Math.floor(k / NOMBRES_PILA.length) % APELLIDOS.length]}`);

type Producto = 'BOT_TRADING' | 'PROYECTO_CRYPTO' | 'TOKEN_SHARE';

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
const fin = (d: Date) => d.toISOString().slice(0, 10);
const aDia = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// Cartera de cada inversor: 1 a 3 productos, repartidos de forma determinista.
function carteraDe(i: number, r: () => number): Producto[] {
  const todos: Producto[] = ['BOT_TRADING', 'PROYECTO_CRYPTO', 'TOKEN_SHARE'];
  const cuantos = 1 + Math.floor(r() * 3);
  const elegidos = new Set<Producto>();
  elegidos.add(todos[i % 3]);
  while (elegidos.size < cuantos) elegidos.add(todos[Math.floor(r() * 3)]);
  return [...elegidos];
}

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('Define SEED_PASSWORD (mínimo 12 caracteres)');

  if (await prisma.tenant.findFirst({ where: { nombre: NOMBRE_EMPRESA } })) {
    console.log('La empresa de pruebas ya existe. No se modifica nada.');
    return;
  }

  const tenant = await prisma.tenant.create({ data: { nombre: NOMBRE_EMPRESA } });
  const hash = hashPassword(password);
  const inversores = [];
  for (let i = 1; i <= N_INVERSORES; i++) {
    const n = String(i).padStart(3, '0');
    inversores.push(await prisma.usuario.create({
      data: { tenantId: tenant.id, email: `inversor${n}@ejemplo.test`, nombre: NOMBRES[i - 1], rol: 'INVERSOR', passwordHash: hash },
    }));
  }

  // Contexto de carga: operación de la plataforma sobre la empresa (acceso de gestión), no es una cuenta de usuario.
  const ctx = { id: 'seed-pruebas', tenantId: tenant.id, rol: 'SUPERADMIN' };
  await conContextoRls(ctx, async (tx) => {
    await tx.condicionesInversion.create({
      data: { tenantId: tenant.id, producto: 'BOT_TRADING', vigenteDesde: INICIO, comisionExitoPct: 20 },
    });

    let contador = 0;
    for (let i = 1; i <= N_INVERSORES; i++) {
      const r = generador(5000 + i);
      const inversor = inversores[i - 1];
      for (const producto of carteraDe(i, r)) {
        // Alta escalonada entre enero de 2025 y septiembre de 2026.
        const mesAlta = Math.floor(r() * 21);
        const alta = aDia(new Date(Date.UTC(2025, mesAlta, 1 + Math.floor(r() * 25))));
        const capital = producto === 'BOT_TRADING' ? 5000 + Math.floor(r() * 25) * 1000 : 3000 + Math.floor(r() * 10) * 1000;
        const posicion = await tx.posicionInversion.create({
          data: {
            tenantId: tenant.id, inversorId: inversor.id, producto, fechaAlta: alta,
            capitalAportado: capital, idOrigen: `prueba-${i}-${producto}`, estado: 'ACTIVA',
          },
        });
        const movs: { tipo: 'APORTACION' | 'RETIRADA' | 'COMISION' | 'RENDIMIENTO' | 'REPARTO'; importe: number; fecha: Date }[] = [
          { tipo: 'APORTACION', importe: capital, fecha: alta },
        ];
        const base = { tenantId: tenant.id, posicionId: posicion.id, inversorId: inversor.id };
        const escribirMovs = async () => {
          const lote = movs.map((m) => {
            contador += 1;
            return { ...base, ...m, idOrigen: `prueba-${contador}` };
          });
          await tx.movimientoInversion.createMany({ data: lote });
        };

        if (producto === 'BOT_TRADING') {
          // Aportaciones y retiradas puntuales (no en todos los inversores).
          const extras = new Map<string, { tipo: 'APORTACION' | 'RETIRADA'; importe: number }>();
          if (r() < 0.4) {
            const d = aDia(new Date(+alta + (60 + Math.floor(r() * 300)) * DIA));
            if (d <= HOY) extras.set(fin(d), { tipo: 'APORTACION', importe: 1000 * (2 + Math.floor(r() * 8)) });
          }
          if (r() < 0.2) {
            const d = aDia(new Date(+alta + (120 + Math.floor(r() * 300)) * DIA));
            if (d <= HOY) extras.set(fin(d), { tipo: 'RETIRADA', importe: 500 * (2 + Math.floor(r() * 5)) });
          }
          // Valor diario con rentabilidad aleatoria; comisión de éxito del 20 % sobre la ganancia del mes.
          let valor = capital;
          let valorInicioMes = capital;
          const valores: { fecha: Date; valor: number }[] = [];
          for (let t = +alta; t <= +HOY; t += DIA) {
            const d = new Date(t);
            valor = valor * (1 + 0.0009 + 0.0065 * normal(r));
            const extra = extras.get(fin(d));
            if (extra?.tipo === 'APORTACION') {
              valor += extra.importe;
              movs.push({ tipo: 'APORTACION', importe: extra.importe, fecha: d });
            }
            if (extra?.tipo === 'RETIRADA' && extra.importe < valor) {
              valor -= extra.importe;
              movs.push({ tipo: 'RETIRADA', importe: extra.importe, fecha: d });
            }
            const siguiente = new Date(t + DIA);
            if (siguiente.getUTCMonth() !== d.getUTCMonth() || t + DIA > +HOY) {
              const ganancia = valor - valorInicioMes;
              if (ganancia > 0) {
                const comision = redondear(ganancia * 0.2);
                valor -= comision;
                movs.push({ tipo: 'COMISION', importe: comision, fecha: d });
              }
              valorInicioMes = valor;
            }
            valores.push({ fecha: aDia(d), valor: redondear(valor) });
          }
          await tx.valorDiarioInversion.createMany({
            data: valores.map((v) => ({
              ...base, fecha: v.fecha, valor: v.valor, idOrigen: `val-${posicion.id}-${fin(v.fecha)}`,
            })),
          });
          await escribirMovs();
        } else if (producto === 'PROYECTO_CRYPTO') {
          // Rendimiento fijo al vencimiento; algunos ya vencidos y otros en curso.
          const tasa = 0.2 + Math.floor(r() * 5) * 0.05;
          const salida = aDia(new Date(Date.UTC(alta.getUTCFullYear(), alta.getUTCMonth() + 6 + Math.floor(r() * 10), alta.getUTCDate())));
          await tx.condicionesInversion.create({
            data: { tenantId: tenant.id, producto, vigenteDesde: alta, tasaFijaPct: redondear(tasa * 100), fechaSalida: salida },
          });
          if (salida <= HOY) {
            movs.push({ tipo: 'RENDIMIENTO', importe: redondear(capital * tasa), fecha: salida });
            await tx.posicionInversion.update({ where: { id: posicion.id }, data: { estado: 'FINALIZADA', fechaBaja: salida } });
          }
          await escribirMovs();
        } else {
          // Share: pago mensual durante 12 meses.
          const tasaMensual = 0.012 + Math.floor(r() * 4) * 0.003;
          await tx.condicionesInversion.create({
            data: { tenantId: tenant.id, producto, vigenteDesde: alta, tasaMensualPct: redondear(tasaMensual * 100), meses: 12 },
          });
          for (let m = 1; m <= 12; m++) {
            const fecha = aDia(new Date(Date.UTC(alta.getUTCFullYear(), alta.getUTCMonth() + m, alta.getUTCDate())));
            if (fecha > HOY) break;
            movs.push({ tipo: 'REPARTO', importe: redondear(capital * tasaMensual), fecha });
          }
          if (+alta + 365 * DIA <= +HOY) {
            await tx.posicionInversion.update({ where: { id: posicion.id }, data: { estado: 'FINALIZADA', fechaBaja: aDia(new Date(+alta + 365 * DIA)) } });
          }
          await escribirMovs();
        }
      }
    }
  }, { timeout: 15 * 60 * 1000 });

  console.log(`Creado: empresa "${NOMBRE_EMPRESA}" con ${N_INVERSORES} inversores de prueba (inversor001..${String(N_INVERSORES).padStart(3, '0')}@ejemplo.test).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
