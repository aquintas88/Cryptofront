// Novedades por versión. Más reciente primero.
// Cada entrada de tipo 'feature' debe enlazar un artículo de ayuda existente (articuloId).
// scripts/check-ayuda.sh impide subir una función nueva sin actualizar la ayuda.
export const VERSION_ACTUAL = '0.2.0';

export interface CambioNovedad {
  tipo: 'feature' | 'improvement' | 'fix';
  texto: string;
  articuloId?: string;
}

export interface EntradaNovedades {
  version: string;
  fecha: string;
  titulo: string;
  cambios: CambioNovedad[];
}

export const CHANGELOG: EntradaNovedades[] = [
  {
    version: '0.2.0',
    fecha: '2026-11-18',
    titulo: 'Base común: acceso, organización, auditoría, soporte y agenda',
    cambios: [
      { tipo: 'feature', texto: 'Inicio de sesión con verificación en dos pasos y bloqueo tras varios intentos fallidos.', articuloId: 'acceso-dos-pasos' },
      { tipo: 'feature', texto: 'Empresas, sucursales, usuarios y roles con permisos por rol.', articuloId: 'organizacion-roles' },
      { tipo: 'feature', texto: 'Auditoría de cambios y claves de integración cifradas.', articuloId: 'auditoria-secretos' },
      { tipo: 'feature', texto: 'Listados con paginación y orden, y fichas de detalle.', articuloId: 'listados-fichas' },
      { tipo: 'feature', texto: 'Plantillas de documento que se generan en PDF.', articuloId: 'plantillas-pdf' },
      { tipo: 'feature', texto: 'Alertas para usuarios y para la empresa.', articuloId: 'alertas' },
      { tipo: 'feature', texto: 'Soporte con tickets, comentarios e historial.', articuloId: 'tickets' },
      { tipo: 'feature', texto: 'Agenda de eventos con zona horaria explícita.', articuloId: 'agenda' },
      { tipo: 'feature', texto: 'Centro de ayuda y novedades dentro de la aplicación.', articuloId: 'ayuda-changelog' },
    ],
  },
];
