// Secretos de integración de un cliente (claves de API, tokens). Cifrados en reposo.
// Regla: ninguna función de este módulo devuelve el valor. Solo el código del servidor
// que usa una integración puede descifrarlo, mediante obtenerValorParaUso.
import { cargarConfig } from '../config';
import { prisma } from '../lib/prisma';
import { cifrar, descifrar } from '../lib/criptografia';
import { ErrorApp } from '../lib/errores';
import { registrarAuditoria } from '../lib/auditoria';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from '../lib/listados';

export const ORDEN_SECRETOS = ['integracion', 'campo', 'actualizadoEn', 'id'] as const;

export const AMBITO_EMPRESA = 'empresa';

// Traduce el ámbito de la API ("empresa" o id de sucursal) al valor guardado ("" o id).
async function ambitoGuardado(tenantId: string, ambito: string): Promise<string> {
  if (ambito === AMBITO_EMPRESA) return '';
  const sucursal = await prisma.sucursal.findFirst({ where: { id: ambito, tenantId } });
  if (!sucursal) throw new ErrorApp(400, 'Ámbito no válido');
  return sucursal.id;
}

function ambitoParaApi(ambitoId: string): string {
  return ambitoId === '' ? AMBITO_EMPRESA : ambitoId;
}

export async function guardarSecreto(
  tenantId: string,
  actorId: string,
  datos: { integracion: string; campo: string; ambito: string; valor: string },
) {
  const ambitoId = await ambitoGuardado(tenantId, datos.ambito);
  const clave = cargarConfig().secretsMasterKey;
  const valorCifrado = cifrar(datos.valor, clave);
  const claveUnica = { tenantId_integracion_campo_ambitoId: { tenantId, integracion: datos.integracion, campo: datos.campo, ambitoId } };

  return prisma.$transaction(async (tx) => {
    const existente = await tx.secretoIntegracion.findUnique({ where: claveUnica });
    const guardado = await tx.secretoIntegracion.upsert({
      where: claveUnica,
      update: { valorCifrado },
      create: { tenantId, integracion: datos.integracion, campo: datos.campo, ambitoId, valorCifrado },
      select: { integracion: true, campo: true, ambitoId: true, actualizadoEn: true },
    });
    // La auditoría registra que cambió, nunca el valor.
    await registrarAuditoria(tx, {
      tenantId,
      actorId,
      entidad: 'SecretoIntegracion',
      entidadId: null,
      accion: existente ? 'EDITAR' : 'CREAR',
      cambios: { integracion: datos.integracion, campo: datos.campo, ambito: ambitoParaApi(ambitoId) },
    });
    return { integracion: guardado.integracion, campo: guardado.campo, ambito: ambitoParaApi(guardado.ambitoId), actualizadoEn: guardado.actualizadoEn };
  });
}

export async function listarSecretos(tenantId: string, params: ParamsListado) {
  const where = { tenantId };
  const [filas, total] = await prisma.$transaction([
    prisma.secretoIntegracion.findMany({
      where,
      select: { id: true, integracion: true, campo: true, ambitoId: true, actualizadoEn: true },
      orderBy: ordenPrisma(params),
      ...paginacion(params),
    }),
    prisma.secretoIntegracion.count({ where }),
  ]);
  const datos = filas.map((f) => ({
    integracion: f.integracion,
    campo: f.campo,
    ambito: ambitoParaApi(f.ambitoId),
    configurado: true,
    actualizadoEn: f.actualizadoEn,
  }));
  return respuestaListado(datos, total, params);
}

export async function eliminarSecreto(
  tenantId: string,
  actorId: string,
  datos: { integracion: string; campo: string; ambito: string },
) {
  const ambitoId = await ambitoGuardado(tenantId, datos.ambito);
  return prisma.$transaction(async (tx) => {
    const borrado = await tx.secretoIntegracion.deleteMany({
      where: { tenantId, integracion: datos.integracion, campo: datos.campo, ambitoId },
    });
    if (borrado.count === 0) throw new ErrorApp(404, 'No encontrado');
    await registrarAuditoria(tx, {
      tenantId,
      actorId,
      entidad: 'SecretoIntegracion',
      entidadId: null,
      accion: 'BORRAR',
      cambios: { integracion: datos.integracion, campo: datos.campo, ambito: datos.ambito },
    });
    return { eliminado: true };
  });
}

// Uso interno: lo llamará el código de cada integración. No se expone por la API.
export async function obtenerValorParaUso(tenantId: string, integracion: string, campo: string, ambito: string) {
  const ambitoId = await ambitoGuardado(tenantId, ambito);
  const fila = await prisma.secretoIntegracion.findUnique({
    where: { tenantId_integracion_campo_ambitoId: { tenantId, integracion, campo, ambitoId } },
  });
  if (!fila) return null;
  return descifrar(fila.valorCifrado, cargarConfig().secretsMasterKey);
}
