import { ErrorApp } from './errores';

// Idiomas en los que se puede configurar la zona de clientes de una empresa.
// Para añadir uno: añadirlo aquí, en la restricción de la migración de Tenant y en el frontend (web/textos.ts).
export const IDIOMAS_CLIENTE = ['es', 'en'] as const;
export type IdiomaCliente = (typeof IDIOMAS_CLIENTE)[number];

export function validarIdioma(valor: unknown): IdiomaCliente {
  if (valor === undefined || valor === null) return 'es';
  if (typeof valor === 'string' && (IDIOMAS_CLIENTE as readonly string[]).includes(valor)) return valor as IdiomaCliente;
  throw new ErrorApp(400, `Idioma no válido. Valores admitidos: ${IDIOMAS_CLIENTE.join(', ')}`);
}
