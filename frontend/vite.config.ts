import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /health se reenvían al backend local. En producción lo sirve el mismo
// dominio o una variable de entorno; nunca una URL fija en el código.
const backend = process.env.VITE_BACKEND_PROXY ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/health': backend,
    },
  },
});
