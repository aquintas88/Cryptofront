// Une clases CSS, omitiendo las falsas (mismo uso que en InmoKira).
export function cn(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ');
}
