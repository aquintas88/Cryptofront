import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { ZONA } from '../lib/zona';
import { PanelInversion } from '../components/PanelInversion';
import type { Idioma } from '../web/textos';

// Zona de inversores: el panel compartido, con las consultas del propio inversor.
export default function Inversor() {
  const usuario = useSesion((s) => s.usuario);
  const idioma: Idioma = usuario?.idioma === 'en' ? 'en' : 'es';
  const z = ZONA[idioma];
  const fuentes = {
    resumen: api.resumenInversor,
    serie: api.serie,
    movimientos: api.movimientos,
    rentabilidad: api.rentabilidad,
  };
  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#0d2240]">
      <header className="flex items-center justify-between bg-[#0d2240] px-6 py-4 text-white">
        <span className="font-serif text-xl tracking-wide">CRYPTOFRONT <span className="text-xs text-[#c9a24a]">ASSET MANAGEMENT</span></span>
        <nav className="flex items-center gap-6 text-sm">
          <span className="border-b-2 border-[#c9a24a] pb-1">{z.cabecera.patrimonio}</span>
          <span className="opacity-70">{z.cabecera.movimientos}</span>
          <span className="opacity-70">{z.cabecera.ayuda}</span>
          <span className="rounded-full bg-[#c9a24a] px-2.5 py-1 text-xs font-bold text-[#0d2240]">
            {usuario?.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </span>
          <button onClick={api.salir} className="rounded border border-[#c9a24a] px-3 py-1 text-xs text-[#c9a24a]">{z.cabecera.salir}</button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <PanelInversion
          clave="inversor"
          fuentes={fuentes}
          idioma={idioma}
          titulo={<>{z.bienvenida}<i className="text-[#b08a3e]">{usuario?.nombre}</i></>}
        />
      </main>
    </div>
  );
}
