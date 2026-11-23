import { useState } from 'react';
import { api } from '../lib/api';
import { useSesion } from '../lib/sesion';

export default function Login() {
  const guardar = useSesion((s) => s.guardar);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preToken, setPreToken] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      if (preToken) {
        guardar(await api.verificar2fa(preToken, codigo));
      } else {
        const r = await api.login(email, password);
        if (r.requiere2fa) setPreToken(r.preToken);
        else guardar(r);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ee] p-6">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl text-[#0d2240]">CRYPTOFRONT</h1>
        <p className="mt-1 text-xs tracking-widest text-[#b08a3e]">ÁREA DE CLIENTES · PRUEBAS</p>
        {!preToken ? (
          <>
            <label className="mt-6 block text-sm text-slate-700">Email
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="mt-4 block text-sm text-slate-700">Contraseña
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </>
        ) : (
          <label className="mt-6 block text-sm text-slate-700">Código de la aplicación 2FA
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 tracking-[0.3em]" inputMode="numeric"
              maxLength={6} required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </label>
        )}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={cargando} className="mt-6 w-full rounded bg-[#0d2240] py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {preToken ? 'Verificar' : 'Entrar'}
        </button>
        <p className="mt-4 text-xs text-slate-500">Acceso con Google y 2FA obligatorio: pendiente de configurar.</p>
      </form>
    </main>
  );
}
