import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { aplicarMetadatos } from './lib/seo';
import { idiomaDelNavegador, rutaIdioma, IDIOMA_DEFECTO, leerRuta } from './web/textos';

// Raíz sin idioma: si el navegador prefiere un idioma publicado distinto del defecto, se muestra ese.
// Solo una vez: si la visita ya ha elegido idioma (selector), se respeta.
{
  const { idioma, base } = leerRuta(window.location.pathname);
  const elegido = localStorage.getItem('cf_idioma');
  if (idioma === null && base === '/' && !elegido) {
    const preferido = idiomaDelNavegador(navigator.languages ?? [navigator.language]);
    if (preferido !== IDIOMA_DEFECTO) {
      window.location.replace(rutaIdioma('/', preferido));
    }
  }
}
import './index.css';

const queryClient = new QueryClient();
aplicarMetadatos(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
