// Formatos de cifras y fechas según el idioma de la empresa. Por defecto, español.
import type { Idioma } from '../web/textos';
import { LOCALE } from '../lib/zona';

// Euros: español 4.000,00 € (separador de miles siempre); inglés €4,000.00.
export const eur = (n: number, idioma: Idioma = 'es') => {
  if (idioma === 'en') return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.');
  const conSeparador = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${conSeparador},${decimales} €`;
};

export const pct = (n: number, idioma: Idioma = 'es') => {
  const signo = n > 0 ? '+' : '';
  const numero = new Intl.NumberFormat(LOCALE[idioma], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
  return idioma === 'en' ? `${signo}${numero}%` : `${signo}${numero} %`;
};

// Mes: «Noviembre de 2026» / «November 2026».
export const mesLargo = (mes: string, idioma: Idioma = 'es') => {
  const t = new Date(mes + '-01T00:00:00Z').toLocaleDateString(LOCALE[idioma], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const fecha = (f: string | Date, idioma: Idioma = 'es') =>
  new Date(f).toLocaleDateString(LOCALE[idioma], { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

// Nombres de producto para la zona de gestión (en español).
export const NOMBRE_PRODUCTO: Record<string, string> = {
  BOT_TRADING: 'Bot de trading',
  PROYECTO_CRYPTO: 'Proyecto crypto',
  TOKEN_SHARE: 'Share (token)',
};

// Fecha y hora en horario de Madrid (las cargas se guardan en UTC).
export const fechaHora = (f: string | Date) =>
  new Date(f).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
