import { create } from 'zustand';
import type { UsuarioPublico } from './api';

interface Estado {
  usuario: UsuarioPublico | null;
  accessToken: string | null;
  refreshToken: string | null;
  guardar: (s: { usuario: UsuarioPublico; accessToken: string; refreshToken: string }) => void;
  cerrar: () => void;
}

const CLAVE = 'kira_refresh';

export const useSesion = create<Estado>((set) => ({
  usuario: null,
  accessToken: null,
  refreshToken: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CLAVE) : null,
  guardar: (s) => {
    sessionStorage.setItem(CLAVE, s.refreshToken);
    set({ usuario: s.usuario, accessToken: s.accessToken, refreshToken: s.refreshToken });
  },
  cerrar: () => {
    sessionStorage.removeItem(CLAVE);
    set({ usuario: null, accessToken: null, refreshToken: null });
  },
}));
