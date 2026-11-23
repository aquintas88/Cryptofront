// Centro de ayuda. Cada función nueva tiene su artículo; el changelog lo enlaza por id.
// Los artículos se escriben para la persona que usa la aplicación, sin detalles internos.
export interface Articulo {
  id: string;
  categoria: string;
  titulo: string;
  contenido: string;
}

export const ARTICULOS: Articulo[] = [
  {
    id: 'acceso-dos-pasos',
    categoria: 'Cuenta',
    titulo: 'Iniciar sesión y verificación en dos pasos',
    contenido:
      'Entra con tu email y tu contraseña. Si tu cuenta tiene activada la verificación en dos pasos, después te pediremos el código de 6 dígitos de tu aplicación de autenticación. Si fallas varias veces seguidas, la cuenta se bloquea 15 minutos por seguridad.',
  },
  {
    id: 'organizacion-roles',
    categoria: 'Organización',
    titulo: 'Empresas, sucursales, usuarios y roles',
    contenido:
      'La empresa tiene sucursales y usuarios. Hay tres roles: SUPERADMIN (administra la plataforma), USUARIO y INVERSOR. Nadie puede desactivarse ni cambiarse su propio rol.',
  },
  {
    id: 'auditoria-secretos',
    categoria: 'Organización',
    titulo: 'Auditoría y claves de integración',
    contenido:
      'La auditoría guarda quién cambió qué y cuándo, sin guardar contraseñas ni claves. El director puede consultarla. Las claves de integración se guardan cifradas: después de guardarlas, solo se ve que existen y cuándo cambiaron; el valor nunca vuelve a mostrarse.',
  },
  {
    id: 'listados-fichas',
    categoria: 'Uso diario',
    titulo: 'Listados, orden y fichas',
    contenido:
      'Los listados muestran las filas por páginas. Puedes ordenar por las columnas indicadas y cambiar el sentido del orden. Al abrir una fila ves su ficha con todos sus datos.',
  },
  {
    id: 'plantillas-pdf',
    categoria: 'Documentos',
    titulo: 'Plantillas de documento en PDF',
    contenido:
      'Una plantilla es un texto con huecos entre llaves dobles, como {{cliente}}. Al generar el PDF, cada hueco se sustituye por el valor que indiques. Si un hueco no tiene valor, queda vacío.',
  },
  {
    id: 'alertas',
    categoria: 'Avisos',
    titulo: 'Alertas',
    contenido:
      'Las alertas avisan de algo que requiere atención. Verás las que te corresponden y las de toda la empresa. Puedes marcar una alerta como resuelta; el registro queda guardado.',
  },
  {
    id: 'tickets',
    categoria: 'Soporte',
    titulo: 'Soporte con tickets',
    contenido:
      'Si algo no funciona, abre un ticket con el asunto y la descripción del problema. Puedes ver tus tickets y comentarlos. El director los gestiona: cambia su estado, su criticidad o quién los atiende, y cada cambio queda en el historial.',
  },
  {
    id: 'agenda',
    categoria: 'Agenda',
    titulo: 'Agenda de la empresa',
    contenido:
      'La agenda muestra los eventos de la empresa en un intervalo de fechas. Al crear un evento indica la fecha de inicio y de fin con su zona horaria, por ejemplo 2026-12-01T10:00:00+01:00. Puedes modificar o borrar los eventos que creaste.',
  },
  {
    id: 'ayuda-changelog',
    categoria: 'Novedades',
    titulo: 'Centro de ayuda y novedades',
    contenido:
      'En el centro de ayuda encontrarás las instrucciones de cada función. Las novedades muestran qué ha cambiado en cada versión.',
  },
];
