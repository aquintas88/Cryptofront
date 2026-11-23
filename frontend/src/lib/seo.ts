// Metadatos por página, aplicados en el cliente según la ruta. Las páginas de clientes no se indexan.
const PAGINAS: Record<string, { titulo: string; descripcion: string; indexable: boolean }> = {
  '/': {
    titulo: 'Cryptofront | Gestión de inversiones en criptoactivos',
    descripcion: 'Plataforma de gestión de inversiones en criptoactivos: consulte su patrimonio, la evolución de su inversión y sus movimientos.',
    indexable: true,
  },
  '/terminos': {
    titulo: 'Términos y condiciones | Cryptofront',
    descripcion: 'Términos y condiciones de uso de los servicios de Cryptofront.',
    indexable: true,
  },
  '/acceso': {
    titulo: 'Acceso de clientes | Cryptofront',
    descripcion: 'Acceso a la zona de clientes de Cryptofront.',
    indexable: false,
  },
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

export function aplicarMetadatos(ruta: string) {
  const p = PAGINAS[ruta] ?? PAGINAS['/acceso'];
  document.title = p.titulo;
  meta('description', p.descripcion);
  meta('og:title', p.titulo, 'property');
  meta('og:description', p.descripcion, 'property');
  meta('twitter:title', p.titulo);
  meta('twitter:description', p.descripcion);
  meta('robots', p.indexable ? 'index, follow' : 'noindex, nofollow');
}
