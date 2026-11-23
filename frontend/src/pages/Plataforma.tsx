import { useState } from 'react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';
import { Modal } from '../components/ui/Modal';
import Cargas from './plataforma/Cargas';
import Usuarios from './plataforma/Usuarios';
import Auditoria from './plataforma/Auditoria';
import PanelPlataforma from './plataforma/PanelPlataforma';

const PESTANAS = [
  { id: 'panel', nombre: 'Panel de inversiones', componente: PanelPlataforma },
  { id: 'cargas', nombre: 'Cargas de datos', componente: Cargas },
  { id: 'usuarios', nombre: 'Usuarios', componente: Usuarios },
  { id: 'auditoria', nombre: 'Auditoría', componente: Auditoria },
] as const;

// Zona de superadmin (en español). Tres pestañas: cargas, cuentas y auditoría.
export default function Plataforma() {
  const usuario = useSesion((s) => s.usuario);
  const [activa, setActiva] = useState<(typeof PESTANAS)[number]['id']>('panel');
  const [miCuenta, setMiCuenta] = useState(false);
  const Vista = PESTANAS.find((p) => p.id === activa)!.componente;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between bg-[#07152b] px-6 py-4 text-white">
        <span className="font-serif text-lg">Plataforma</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="opacity-70">{usuario?.nombre}</span>
          <button onClick={() => setMiCuenta(true)} className="rounded border border-white/40 px-3 py-1 text-xs">Mi contraseña</button>
          <button onClick={api.salir} className="rounded border border-white/40 px-3 py-1 text-xs">Salir</button>
        </div>
      </header>
      <nav className="border-b border-slate-200 bg-white px-6">
        <ul className="mx-auto flex max-w-6xl gap-6">
          {PESTANAS.map((p) => (
            <li key={p.id}>
              <button onClick={() => setActiva(p.id)} aria-current={activa === p.id ? 'page' : undefined}
                className={`border-b-2 py-3 text-sm ${activa === p.id ? 'border-[#c9a24a] font-semibold text-[#0d2240]' : 'border-transparent text-slate-500 hover:text-[#0d2240]'}`}>
                {p.nombre}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto max-w-6xl p-6">
        <Vista />
      </main>
      {miCuenta && <CambioPropio onCerrar={() => setMiCuenta(false)} />}
    </div>
  );
}

function CambioPropio({ onCerrar }: { onCerrar: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== repetir) return setMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    try {
      await api.cambiarPassword(actual, nueva);
      setMensaje({ tipo: 'ok', texto: 'Contraseña cambiada. Se han cerrado las demás sesiones.' });
      setActual(''); setNueva(''); setRepetir('');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.' });
    }
  }
  return (
    <Modal titulo="Mi contraseña" onCerrar={onCerrar}>
      <form onSubmit={enviar} className="space-y-3 text-sm">
        <input type="password" placeholder="Contraseña actual" required value={actual} onChange={(e) => setActual(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input type="password" placeholder="Contraseña nueva (mínimo 12 caracteres)" required minLength={12} value={nueva} onChange={(e) => setNueva(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2" />
        <input type="password" placeholder="Repita la contraseña nueva" required minLength={12} value={repetir} onChange={(e) => setRepetir(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2" />
        {mensaje && <p className={mensaje.tipo === 'ok' ? 'text-emerald-700' : 'text-red-700'}>{mensaje.texto}</p>}
        <button className="rounded-full bg-[#07152b] px-5 py-2 font-semibold text-white">Guardar</button>
      </form>
    </Modal>
  );
}
