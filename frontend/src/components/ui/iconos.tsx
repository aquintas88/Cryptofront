// Iconos mínimos (sin dependencias externas) para los componentes portados de InmoKira.
type P = { className?: string };
const base = (children: React.ReactNode) => (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden="true">{children}</svg>
);
export const ChevronDown = base(<path d="m6 9 6 6 6-6" />);
export const X = base(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const Star = base(<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />);
export const ChevronUp = base(<path d="m18 15-6-6-6 6" />);
