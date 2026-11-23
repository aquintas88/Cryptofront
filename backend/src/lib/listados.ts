// Listados estándar: paginados, ordenables por campos permitidos y con desempate por id.
import { ErrorApp } from './errores';

export interface ParamsListado {
  pagina: number;
  tamano: number;
  orden: string;
  direccion: 'asc' | 'desc';
}

const TAMANO_POR_DEFECTO = 25;
const TAMANO_MAXIMO = 100;

// Lee la query de la petición. El orden solo acepta campos de la lista blanca: nunca se
// interpola texto del cliente en la consulta.
export function leerParamsListado(
  query: Record<string, unknown>,
  camposOrdenables: readonly string[],
  ordenPorDefecto: string,
  direccionPorDefecto: 'asc' | 'desc' = 'asc',
): ParamsListado {
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  if (!Number.isInteger(pagina) || pagina < 1) throw new ErrorApp(400, 'Página no válida');

  const tamano = query.tamano === undefined ? TAMANO_POR_DEFECTO : Number(query.tamano);
  if (!Number.isInteger(tamano) || tamano < 1 || tamano > TAMANO_MAXIMO) {
    throw new ErrorApp(400, `Tamaño no válido (1 a ${TAMANO_MAXIMO})`);
  }

  const orden = query.orden === undefined ? ordenPorDefecto : String(query.orden);
  if (!camposOrdenables.includes(orden)) throw new ErrorApp(400, 'Orden no válido');

  const direccion = query.direccion === undefined ? direccionPorDefecto : String(query.direccion);
  if (direccion !== 'asc' && direccion !== 'desc') throw new ErrorApp(400, 'Dirección no válida');

  return { pagina, tamano, orden, direccion };
}

// Criterios de Prisma: el campo elegido y, siempre, el id como desempate estable.
export function ordenPrisma(params: ParamsListado) {
  const principal = { [params.orden]: params.direccion };
  return params.orden === 'id' ? [principal] : [principal, { id: params.direccion }];
}

export function paginacion(params: ParamsListado) {
  return { skip: (params.pagina - 1) * params.tamano, take: params.tamano };
}

export function respuestaListado<T>(datos: T[], total: number, params: ParamsListado) {
  return { datos, total, pagina: params.pagina, tamano: params.tamano, orden: params.orden, direccion: params.direccion };
}
