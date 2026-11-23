// Plantillas de documento de texto con variables {{nombre}}, convertidas a PDF bajo demanda.
// El PDF dibuja el texto literal: no se interpreta HTML ni código, así que un valor
// malicioso se muestra como texto. Aun así, cada valor se limpia de caracteres de control y se limita.
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { ErrorApp } from '../lib/errores';
import { diferencias, registrarAuditoria } from '../lib/auditoria';
import { ParamsListado, ordenPrisma, paginacion, respuestaListado } from '../lib/listados';
import { esDuplicado } from './plataforma.service';

export const ORDEN_PLANTILLAS = ['nombre', 'actualizadoEn', 'id'] as const;
const MAX_CONTENIDO = 20000;
const MAX_VALOR = 500;
const SELECCION = { id: true, nombre: true, contenido: true, creadoEn: true, actualizadoEn: true } as const;

export async function listarPlantillas(tenantId: string, params: ParamsListado) {
  const where = { tenantId };
  const [datos, total] = await prisma.$transaction([
    prisma.plantillaDocumento.findMany({ where, select: SELECCION, orderBy: ordenPrisma(params), ...paginacion(params) }),
    prisma.plantillaDocumento.count({ where }),
  ]);
  return respuestaListado(datos, total, params);
}

export async function obtenerPlantilla(tenantId: string, id: string) {
  const plantilla = await prisma.plantillaDocumento.findFirst({ where: { id, tenantId }, select: SELECCION });
  if (!plantilla) throw new ErrorApp(404, 'No encontrada');
  return plantilla;
}

export async function crearPlantilla(tenantId: string, actorId: string, datos: { nombre: string; contenido: string }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const plantilla = await tx.plantillaDocumento.create({ data: { tenantId, ...datos }, select: SELECCION });
      await registrarAuditoria(tx, {
        tenantId,
        actorId,
        entidad: 'PlantillaDocumento',
        entidadId: plantilla.id,
        accion: 'CREAR',
        cambios: { nombre: plantilla.nombre },
      });
      return plantilla;
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorApp(409, 'Ya existe una plantilla con ese nombre');
    throw error;
  }
}

export async function actualizarPlantilla(
  tenantId: string,
  actorId: string,
  id: string,
  cambios: { nombre?: string; contenido?: string },
) {
  const antes = await obtenerPlantilla(tenantId, id);
  try {
    return await prisma.$transaction(async (tx) => {
      const despues = await tx.plantillaDocumento.update({ where: { id }, data: cambios, select: SELECCION });
      const diff = diferencias(antes, despues);
      // El contenido puede ser largo: la auditoría registra qué campo cambió, no su texto.
      // actualizadoEn cambia siempre que se guarda: no es un cambio de negocio.
      const campos = Object.keys(diff).filter((c) => c !== 'actualizadoEn');
      if (campos.length > 0) {
        await registrarAuditoria(tx, {
          tenantId,
          actorId,
          entidad: 'PlantillaDocumento',
          entidadId: id,
          accion: 'EDITAR',
          cambios: { campos },
        });
      }
      return despues;
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ErrorApp(409, 'Ya existe una plantilla con ese nombre');
    throw error;
  }
}

// Limpia un valor de variable: sin caracteres de control (salvo salto de línea) y con longitud máxima.
export function limpiarValor(valor: unknown): string {
  if (typeof valor !== 'string' && typeof valor !== 'number') throw new ErrorApp(400, 'Valor de variable no válido');
  return String(valor)
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .slice(0, MAX_VALOR);
}

// Sustituye {{clave}} por su valor. Las claves que no se indican quedan vacías.
export function rellenar(contenido: string, variables: Record<string, string>): string {
  return contenido.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/g, (_, clave: string) => variables[clave] ?? '');
}

export async function generarPdf(tenantId: string, id: string, variablesEntrada: unknown): Promise<Buffer> {
  const plantilla = await obtenerPlantilla(tenantId, id);
  if (variablesEntrada !== undefined && (typeof variablesEntrada !== 'object' || variablesEntrada === null || Array.isArray(variablesEntrada))) {
    throw new ErrorApp(400, 'Variables no válidas');
  }
  const variables: Record<string, string> = {};
  for (const [clave, valor] of Object.entries((variablesEntrada as Record<string, unknown>) ?? {})) {
    if (!/^[a-z_][a-z0-9_]*$/.test(clave)) throw new ErrorApp(400, 'Nombre de variable no válido');
    variables[clave] = limpiarValor(valor);
  }

  const texto = rellenar(plantilla.contenido, variables);
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const trozos: Buffer[] = [];
    doc.on('data', (trozo: Buffer) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);
    doc.fontSize(12).text(plantilla.nombre, { underline: false }).moveDown();
    doc.fontSize(11).text(texto, { align: 'left' });
    doc.end();
  });
}

export function validarContenido(contenido: unknown): string {
  if (typeof contenido !== 'string' || contenido.trim().length === 0 || contenido.length > MAX_CONTENIDO) {
    throw new ErrorApp(400, `Contenido no válido (máximo ${MAX_CONTENIDO} caracteres)`);
  }
  return contenido;
}
