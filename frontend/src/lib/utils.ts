// Une clases CSS, omitiendo las falsas (mismo uso que en InmoKira).
export function cn(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ');
}

// Texto sin tildes para búsquedas insensibles a acentos (mismo criterio que InmoKira).
export function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
