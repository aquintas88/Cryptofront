import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { useSesion } from './lib/sesion';
import Login from './pages/Login';
import Inversor from './pages/Inversor';
import Gestion from './pages/Gestion';
import Plataforma from './pages/Plataforma';
import Web from './web/Web';
import Terminos from './web/Terminos';

// Vista según el rol de la sesión. El servidor es quien decide qué datos devuelve.
export default function App() {
  // Rutas públicas: / (web) y /terminos. El resto (/acceso) es la zona de clientes.
  const ruta = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (ruta === '/') return <Web />;
  if (ruta === '/terminos') return <Terminos />;
  const { usuario, refreshToken, guardar } = useSesion();
  const [restaurando, setRestaurando] = useState(Boolean(refreshToken && !usuario));

  useEffect(() => {
    if (!restaurando) return;
    api.restaurar().finally(() => setRestaurando(false));
    // Solo al cargar la página: la sesión se restaura una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (restaurando) return <p className="p-6 text-sm text-slate-500">Cargando…</p>;
  if (!usuario) return <Login />;
  if (usuario.rol === 'INVERSOR') return <Inversor />;
  if (usuario.rol === 'DIRECTOR_EMPRESA') return <Gestion />;
  if (usuario.rol === 'SUPERADMIN') return <Plataforma />;
  return (
    <main className="p-6">
      <p className="text-sm">Esta cuenta no tiene zona de inversores.</p>
      <button className="mt-3 text-sm underline" onClick={api.salir}>Salir</button>
    </main>
  );
  void guardar;
}
