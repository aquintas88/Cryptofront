export const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
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
