// Euros con separador de miles siempre (4.000,00 €), como el resto de cifras de la aplicación.
export const eur = (n: number) => {
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.');
  const conSeparador = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${conSeparador},${decimales}\u00A0€`;
};
// Mes en formato «Noviembre de 2026» (mayúscula solo al inicio).
export const mesLargo = (mes: string) => {
  const t = new Date(mes + '-01T00:00:00Z').toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const pct = (n: number) =>
  `${n > 0 ? '+' : ''}${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} %`;
export const fecha = (f: string | Date) =>
  new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const NOMBRE_PRODUCTO: Record<string, string> = {
  BOT_TRADING: 'Bot de trading',
  PROYECTO_CRYPTO: 'Proyecto crypto',
  TOKEN_SHARE: 'Share (token)',
};
export const TIPO_MOVIMIENTO: Record<string, string> = {
  APORTACION: 'Aportación', RETIRADA: 'Retirada', COMISION: 'Comisión de éxito',
  RENDIMIENTO: 'Rendimiento', REPARTO: 'Pago mensual',
};
