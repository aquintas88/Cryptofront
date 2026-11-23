// Metadatos por página e idioma, aplicados en el cliente según la ruta. La zona de clientes no se indexa.
import { leerRuta, IDIOMAS, IDIOMA_DEFECTO, rutaIdioma, type Idioma } from '../web/textos';

type Pagina = { titulo: string; descripcion: string; indexable: boolean };
const PAGINAS: Record<Idioma, Record<string, Pagina>> = {
  es: {
    '/': { titulo: 'Cryptofront | Gestión de inversiones en criptoactivos', descripcion: 'Plataforma de gestión de inversiones en criptoactivos: consulte su patrimonio, la evolución de su inversión y sus movimientos.', indexable: true },
    '/terminos': { titulo: 'Términos y condiciones | Cryptofront', descripcion: 'Términos y condiciones de uso de los servicios de Cryptofront.', indexable: true },
  },
  en: {
    '/': { titulo: 'Cryptofront | Cryptoasset investment management', descripcion: 'Cryptoasset investment management platform: review your wealth, the performance of your investment and your transactions.', indexable: true },
    '/terminos': { titulo: 'Terms and conditions | Cryptofront', descripcion: 'Terms and conditions for the use of Cryptofront services.', indexable: true },
  },
};
const ACCESO: Record<Idioma, Pagina> = {
  es: { titulo: 'Acceso de clientes | Cryptofront', descripcion: 'Acceso a la zona de clientes de Cryptofront.', indexable: false },
  en: { titulo: 'Client access | Cryptofront', descripcion: 'Access to the Cryptofront client area.', indexable: false },
};

function meta(nombre: string, valor: string, atributo: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${nombre}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(atributo, nombre);
    document.head.appendChild(el);
  }
  el.setAttribute('content', valor);
}

// Enlaces alternativos por idioma (hreflang), con la URL absoluta del despliegue actual.
function alternativas(base: string) {
  document.head.querySelectorAll('link[rel="alternate"][data-cf]').forEach((n) => n.remove());
  for (const i of [...IDIOMAS, 'x-default' as const]) {
    const l = document.createElement('link');
    l.rel = 'alternate';
    l.setAttribute('data-cf', '1');
    l.hreflang = i;
    const idioma = i === 'x-default' ? IDIOMA_DEFECTO : i;
    l.href = window.location.origin + rutaIdioma(base, idioma);
    document.head.appendChild(l);
  }
}

export function aplicarMetadatos(pathname: string) {
  const { idioma, base } = leerRuta(pathname);
  const lang: Idioma = idioma ?? IDIOMA_DEFECTO;
  const p = PAGINAS[lang][base] ?? ACCESO[lang];
  document.documentElement.lang = lang;
  document.title = p.titulo;
  meta('description', p.descripcion);
  meta('og:title', p.titulo, 'property');
  meta('og:description', p.descripcion, 'property');
  meta('og:locale', lang === 'en' ? 'en_GB' : 'es_ES', 'property');
  meta('twitter:title', p.titulo);
  meta('twitter:description', p.descripcion);
  meta('robots', p.indexable ? 'index, follow' : 'noindex, nofollow');
  if (PAGINAS[lang][base]) alternativas(base);
}
