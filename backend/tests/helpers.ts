import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/criptografia';
import { conContextoRls } from '../src/lib/contexto-rls';

export const PASSWORD_PRUEBA = 'contraseña-ficticia-larga-1';

// Limpia las tablas de negocio en orden de dependencias. La auditoría no se borra: el rol de la
// aplicación no puede borrarla. Cada prueba usa empresas nuevas y filtra por la suya.
export async function limpiarBD() {
  // Las tablas de inversiones tienen RLS: se limpian dentro del contexto de gestión de cada empresa.
  for (const { id } of await prisma.tenant.findMany({ select: { id: true } })) {
    await conContextoRls({ id: 'limpieza', tenantId: id, rol: 'DIRECTOR_EMPRESA' }, async (tx) => {
      await tx.movimientoInversion.deleteMany();
      await tx.valorDiarioInversion.deleteMany();
      await tx.posicionInversion.deleteMany();
      await tx.condicionesInversion.deleteMany();
    });
  }
  await prisma.cargaInversion.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.ticketHistorial.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.alerta.deleteMany();
  await prisma.plantillaDocumento.deleteMany();
  await prisma.secretoIntegracion.deleteMany();
  await prisma.sesionRefresco.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.sucursal.deleteMany();
  await prisma.tenant.deleteMany();
}

let contador = 0;
export function emailUnico(prefijo = 'usuario') {
  contador += 1;
  return `${prefijo}-${Date.now()}-${contador}@ejemplo.test`;
}

export async function crearEmpresa(nombre = 'Empresa ficticia') {
  return prisma.tenant.create({ data: { nombre } });
}

export async function crearPlataforma() {
  const tenant = await prisma.tenant.create({ data: { nombre: 'Plataforma', esPlataforma: true } });
  return crearUsuario({ tenantId: tenant.id, rol: 'SUPERADMIN' });
}

export async function crearUsuario(
  opciones: {
    tenantId?: string;
    rol?: 'SUPERADMIN' | 'DIRECTOR_EMPRESA' | 'COORDINADOR' | 'USUARIO' | 'INVERSOR';
    email?: string;
    password?: string;
    activo?: boolean;
    sucursalId?: string | null;
  } = {},
) {
  const tenantId = opciones.tenantId ?? (await crearEmpresa()).id;
  const password = opciones.password ?? PASSWORD_PRUEBA;
  const usuario = await prisma.usuario.create({
    data: {
      tenantId,
      email: opciones.email ?? emailUnico(),
      nombre: 'Usuario ficticio',
      rol: opciones.rol ?? 'USUARIO',
      passwordHash: hashPassword(password),
      activo: opciones.activo ?? true,
      sucursalId: opciones.sucursalId ?? null,
    },
  });
  return { usuario, password };
}

// Inicia sesión y devuelve el token de acceso.
export async function tokenDe(app: Parameters<typeof request>[0], email: string, password = PASSWORD_PRUEBA) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200 || !res.body.accessToken) {
    throw new Error(`No se pudo iniciar sesión en la prueba: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  return res.body.accessToken as string;
}
