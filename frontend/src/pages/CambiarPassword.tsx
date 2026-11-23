import { useState } from 'react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';

// Cambio de contraseña obligatorio tras una clave temporal. Cierra el resto de sesiones al completarse.
export default function CambiarPassword() {
  const usuario = useSesion((s) => s.usuario);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva.length < 12) return setError('La contraseña nueva debe tener al menos 12 caracteres.');
    if (nueva !== repetir) return setError('Las contraseñas nuevas no coinciden.');
    if (nueva === actual) return setError('La contraseña nueva debe ser distinta de la temporal.');
    setEnviando(true);
    try {
      await api.cambiarPassword(actual, nueva);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07152b] p-6">
      <form onSubmit={enviar} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="font-serif text-2xl text-[#0d2240]">Cambie su contraseña</h1>
        <p className="text-sm text-slate-600">
          Hola, {usuario?.nombre}. Su contraseña temporal debe cambiarse antes de continuar.
        </p>
        <label className="block text-sm">
          <span className="text-slate-700">Contraseña temporal</span>
          <input type="password" autoComplete="current-password" required value={actual} onChange={(e) => setActual(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Contraseña nueva (mínimo 12 caracteres)</span>
          <input type="password" autoComplete="new-password" required minLength={12} value={nueva} onChange={(e) => setNueva(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Repita la contraseña nueva</span>
          <input type="password" autoComplete="new-password" required minLength={12} value={repetir} onChange={(e) => setRepetir(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5" />
        </label>
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={enviando} className="w-full rounded-full bg-[#07152b] py-3 font-semibold text-white disabled:opacity-60">
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
        <button type="button" onClick={api.salir} className="w-full text-sm text-slate-500 underline">Salir</button>
      </form>
    </main>
  );
}
