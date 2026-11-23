import type { ReactNode } from 'react';

// Diálogo modal sencillo. Cierra con Escape o con el botón de cerrar.
export function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#07152b]/60 p-4" onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className="my-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-[#0d2240]">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
