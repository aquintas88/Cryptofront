import { createContext, useContext } from 'react';
import { EMAIL_CONTACTO, TELEFONO, TEXTOS, IDIOMAS, ETIQUETA_IDIOMA, rutaIdioma, type Idioma, type Textos } from './textos';

interface Contexto {
  idioma: Idioma;
  t: Textos;
  // Enlace a una página concreta en el idioma actual o en otro.
  enlace: (ruta: string, idioma?: Idioma) => string;
  // Enlace al mismo contenido en otro idioma (cambio de idioma en la cabecera).
  cambiarA: (idioma: Idioma) => string;
  base: string;
}

export const IdiomaContext = createContext<Contexto>({
  idioma: 'es',
  t: TEXTOS.es,
  enlace: (r) => r,
  cambiarA: () => '/es',
  base: '/',
});

export const useIdioma = () => useContext(IdiomaContext);

export function crearContexto(idioma: Idioma, base: string): Contexto {
  return {
    idioma,
    t: TEXTOS[idioma],
    enlace: (ruta, otro = idioma) => (ruta.startsWith('#') ? ruta : rutaIdioma(ruta, otro)),
    cambiarA: (otro) => rutaIdioma(base, otro),
    base,
  };
}

// Selector de idioma: un enlace por cada idioma publicado, con el idioma actual marcado.
export function SelectorIdioma() {
  const { idioma, cambiarA } = useIdioma();
  return (
    <nav aria-label="Idioma" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest">
      {IDIOMAS.map((i) => (
        <a
          key={i}
          href={cambiarA(i)}
          hrefLang={i}
          lang={i}
          aria-current={i === idioma ? 'true' : undefined}
          onClick={() => localStorage.setItem('cf_idioma', i)}
          title={ETIQUETA_IDIOMA[i]}
          className={i === idioma ? 'rounded px-2 py-1 text-[#c9a24a]' : 'rounded px-2 py-1 text-white/50 hover:text-white'}
        >
          {i}
        </a>
      ))}
    </nav>
  );
}

export const CONTACTO = { email: EMAIL_CONTACTO, telefono: TELEFONO };
