// Textos de la web pública en español e inglés. La versión inglesa es una traducción del texto vigente:
// no añade ni suaviza afirmaciones. Las cifras, garantías y rentabilidades están pendientes de revisión legal en ambos idiomas.
export type Idioma = 'es' | 'en';

export const WHATSAPP = 'https://wa.me/34615608565';
export const EMAIL_CONTACTO = 'infocryptofront@gmail.com';
export const TELEFONO = '615 608 565';

const es = {
  cabecera: {
    estrategias: 'Estrategias',
    seguridad: 'Seguridad',
    contacto: 'Contacto',
    avisoLegal: 'Aviso legal',
    areaClientes: 'Área de clientes',
    whatsapp: 'WhatsApp',
    mensajeWhatsapp: 'Hola CryptoFront, deseo información sobre gestión patrimonial.',
  },
  hero: {
    superetiqueta: 'Excelencia en Trading Algorítmico',
    titulo1: 'Preservación y ',
    titulo2: 'Crecimiento',
    titulo3: ' de su Patrimonio',
    texto: 'Combinamos la experiencia de los mercados institucionales con inteligencia artificial para buscar rendimientos consistentes y un marco jurídico claro.',
    explorar: 'Explorar Carteras',
    seguridad: 'Protocolo de Seguridad',
  },
  tarjetas: [
    { n: '01', titulo: 'IA Propietaria', texto: 'Algoritmos que operan 24/7, sin sesgos emocionales.' },
    { n: '02', titulo: 'Gestión Activa', texto: 'Seguimiento permanente de riesgo financiero y ciberseguridad.' },
    { n: '03', titulo: 'Transparencia Operativa', texto: '100%' },
  ],
  franja: ['Trading algorítmico', 'Inteligencia artificial', 'Gestión activa', 'Transparencia operativa', 'Seguridad jurídica', 'Capital protegido por contrato'],
  confianza: {
    etiqueta: '01 — CONFIANZA',
    titulo: 'Una Institución de Confianza Digital',
    texto: 'Nuestro equipo tiene décadas de experiencia en mercados tradicionales. Llevamos ese rigor financiero al mundo digital y eliminamos el error humano de la ecuación.',
  },
  bots: {
    etiqueta: '02 — ESTRATEGIAS',
    titulo: 'Estrategias de Inversión',
    intro: 'Elija el vehículo de inversión que mejor se adapte a su perfil de riesgo y a sus objetivos financieros.',
    capitalMinimo: 'Capital Mínimo',
    objetivo: 'Objetivo',
    garantia: 'Garantía',
    tasaAnual: 'Rentabilidad objetivo anual',
  },
  seguridad: {
    etiqueta: '03 — SEGURIDAD',
    subtitulo: 'Seguridad de Grado Institucional',
    titulo: 'Capital Protegido por Contrato',
    texto: 'Una doble capa: un contrato de garantía jurídica reforzado por una póliza de cobertura. Si hubiera pérdidas técnicas, el mecanismo prevé la reposición total de los fondos aportados.',
  },
  formulario: {
    etiqueta: '04 — CONTACTO',
    titulo: 'Solicitar Consultoría Privada',
    intro: 'Atención exclusiva y personalizada.',
    telefono: 'Teléfono',
    nombre: 'Nombre',
    apellido: 'Apellido',
    email: 'Email Corporativo / Personal',
    consulta: 'Detalle de su Consulta',
    aceptoPrefijo: 'He leído y acepto los ',
    terminos: 'Términos y Condiciones',
    aceptoSufijo: ' y la Política de Privacidad. ',
    enviar: 'Enviar Solicitud de Apertura',
    enviadoTitulo: 'Solicitud Recibida',
    enviadoTexto: 'Gracias por contactar con CryptoFront. Nuestro equipo de asesores revisará su perfil y se pondrá en contacto a la brevedad.',
    pruebas: 'Entorno de pruebas: el formulario aún no envía solicitudes a ningún sistema.',
  },
  pie: { terminos: 'Términos y Condiciones' },
  terminosPagina: {
    etiqueta: 'Aviso Legal',
    titulo: 'Términos y Condiciones',
    intro: 'El acceso y el uso de los servicios de gestión patrimonial de CryptoFront implica la aceptación plena de estos términos.',
    dudas: '¿Dudas legales? Contacte con nuestro departamento jurídico:',
    clausulas: [
      ['Objeto del Servicio', 'Gestión de inversiones en activos digitales mediante software propio de trading algorítmico. CryptoFront actúa como gestor técnico del capital del cliente.'],
      ['Advertencia de Riesgo y Cobertura', 'Los mercados de criptoactivos presentan volatilidad inherente. Las estrategias de diversificación y cobertura (por ejemplo, el Bot de Oro) buscan moderarla. Garantía de Capital: el capital inicial aportado está garantizado contractualmente y el cliente no asumirá pérdidas sobre su depósito inicial al finalizar el periodo pactado.'],
      ['Mecanismo de Garantía', 'La garantía se formaliza mediante un contrato legal vinculante. Si el balance final es inferior al depósito, CryptoFront repone la diferencia para asegurar el 100% del capital aportado.'],
      ['Estructura de Comisiones', 'Modelo de comisión de éxito (performance fee). Se aplica únicamente sobre las ganancias netas generadas, nunca sobre el capital principal.'],
      ['Requisitos del Inversor', 'El inversor declara ser mayor de edad, tener capacidad legal y haber leído la documentación de riesgo.'],
      ['Legislación y Jurisdicción', 'Se rige por las leyes de España. Para cualquier controversia son competentes los juzgados y tribunales de Madrid.'],
    ] as [string, string][],
  },
  estrategias: [
    {
      id: 'clasico',
      tab: 'Bot Clásico (Crypto)',
      etiqueta: 'Rendimiento Constante',
      titulo: 'Arbitraje Alpha',
      tipo: 'Crypto',
      subetiqueta: 'Alta Frecuencia',
      descripcion: 'Operativa algorítmica de alta frecuencia diseñada para aprovechar ineficiencias del mercado cripto, con un enfoque cuantitativo y resultados probados.',
      capitalMinimo: '5.000 €',
      objetivo: 'Preservación de Capital',
      garantia: '100% del Capital Invertido',
      caracteristicas: ['Análisis de volatilidad en tiempo real', 'Ejecución en milisegundos', 'Contrato de preservación de capital'],
      cta: 'Iniciar Estrategia Clásica',
      mensajeWhatsapp: 'Hola, estoy interesado en el Bot Clásico.',
    },
    {
      id: 'oro',
      tab: 'Bot de Oro Premium',
      etiqueta: 'Máxima Protección',
      titulo: 'Titan Gold Dual',
      tipo: 'Dual',
      subetiqueta: 'Crypto + Gold Hedging',
      descripcion: 'Estrategia híbrida: cuando la IA detecta turbulencias en el mercado cripto, rota el capital hacia ORO (XAU) como activo refugio.',
      capitalMinimo: '10.000 €',
      tramos: [
        { desde: '10.000 €', tasa: 'hasta 7% anual' },
        { desde: '20.000 €', tasa: 'hasta 17% anual' },
        { desde: '30.000 €', tasa: 'hasta 27% anual' },
      ],
      garantia: 'El capital inicial queda protegido mediante contrato de garantía. Los beneficios se gestionan bajo un sistema de custodia que prioriza su conservación.',
      caracteristicas: ['Rebalanceo automático de cartera', 'Exposición reducida en mercados bajistas', 'Prioridad en soporte técnico'],
      cta: 'Iniciar Estrategia Titan Gold',
      mensajeWhatsapp: 'Hola, estoy interesado en el Bot de Oro Premium.',
    },
  ],
  plazos: [
    { cifra: '1 año', etiqueta: 'Plazo Mínimo', nota: 'Recomendado' },
    { cifra: '1 - 3 años', etiqueta: 'Horizonte Óptimo', nota: '' },
    { cifra: '5 años', etiqueta: 'Plan Patrimonial', nota: '' },
  ],
};

const en: typeof es = {
  cabecera: {
    estrategias: 'Strategies',
    seguridad: 'Security',
    contacto: 'Contact',
    avisoLegal: 'Legal notice',
    areaClientes: 'Client area',
    whatsapp: 'WhatsApp',
    mensajeWhatsapp: 'Hello CryptoFront, I would like information about wealth management.',
  },
  hero: {
    superetiqueta: 'Excellence in Algorithmic Trading',
    titulo1: 'Preservation and ',
    titulo2: 'Growth',
    titulo3: ' of Your Wealth',
    texto: 'We combine the experience of institutional markets with artificial intelligence to pursue consistent returns within a clear legal framework.',
    explorar: 'Explore Portfolios',
    seguridad: 'Security Protocol',
  },
  tarjetas: [
    { n: '01', titulo: 'Proprietary AI', texto: 'Algorithms that operate 24/7, free from emotional bias.' },
    { n: '02', titulo: 'Active Management', texto: 'Continuous monitoring of financial and cybersecurity risk.' },
    { n: '03', titulo: 'Operational Transparency', texto: '100%' },
  ],
  franja: ['Algorithmic trading', 'Artificial intelligence', 'Active management', 'Operational transparency', 'Legal certainty', 'Capital protected by contract'],
  confianza: {
    etiqueta: '01 — TRUST',
    titulo: 'A Trusted Digital Institution',
    texto: 'Our team has decades of experience in traditional markets. We bring that financial rigor to the digital world and remove human error from the equation.',
  },
  bots: {
    etiqueta: '02 — STRATEGIES',
    titulo: 'Investment Strategies',
    intro: 'Choose the investment vehicle that best fits your risk profile and financial goals.',
    capitalMinimo: 'Minimum Capital',
    objetivo: 'Objective',
    garantia: 'Guarantee',
    tasaAnual: 'Target annual return',
  },
  seguridad: {
    etiqueta: '03 — SECURITY',
    subtitulo: 'Institutional-Grade Security',
    titulo: 'Capital Protected by Contract',
    texto: 'A double layer: a legally binding guarantee contract backed by an insurance policy. In the event of technical losses, the mechanism provides for full reimbursement of the funds invested.',
  },
  formulario: {
    etiqueta: '04 — CONTACT',
    titulo: 'Request a Private Consultation',
    intro: 'Exclusive and personalized attention.',
    telefono: 'Phone',
    nombre: 'First name',
    apellido: 'Last name',
    email: 'Business / Personal email',
    consulta: 'Details of your enquiry',
    aceptoPrefijo: 'I have read and accept the ',
    terminos: 'Terms and Conditions',
    aceptoSufijo: ' and the Privacy Policy. ',
    enviar: 'Submit Account Opening Request',
    enviadoTitulo: 'Request Received',
    enviadoTexto: 'Thank you for contacting CryptoFront. Our advisory team will review your profile and contact you shortly.',
    pruebas: 'Test environment: the form does not yet send requests to any system.',
  },
  pie: { terminos: 'Terms and Conditions' },
  terminosPagina: {
    etiqueta: 'Legal Notice',
    titulo: 'Terms and Conditions',
    intro: "Access to and use of CryptoFront's wealth management services implies full acceptance of these terms.",
    dudas: 'Legal questions? Contact our legal department:',
    clausulas: [
      ['Purpose of the Service', "Management of investments in digital assets using proprietary algorithmic trading software. CryptoFront acts as the technical manager of the client's capital."],
      ['Risk Warning and Coverage', "Crypto-asset markets are inherently volatile. Diversification and hedging strategies (for example, the Gold Bot) seek to moderate this volatility. Capital guarantee: the initial capital contributed is contractually guaranteed, and the client will not bear losses on the initial deposit at the end of the agreed period."],
      ['Guarantee Mechanism', 'The guarantee is formalized through a binding legal contract. If the final balance is lower than the deposit, CryptoFront replenishes the difference to secure 100% of the capital contributed.'],
      ['Fee Structure', 'Performance fee model. It applies only to the net profits generated, never to the principal capital.'],
      ['Investor Requirements', 'The investor declares being of legal age, having legal capacity and having read the risk documentation.'],
      ['Governing Law and Jurisdiction', 'These terms are governed by Spanish law. The courts and tribunals of Madrid have jurisdiction over any dispute.'],
    ] as [string, string][],
  },
  estrategias: [
    {
      id: 'clasico',
      tab: 'Classic Bot (Crypto)',
      etiqueta: 'Steady Performance',
      titulo: 'Alpha Arbitrage',
      tipo: 'Crypto',
      subetiqueta: 'High Frequency',
      descripcion: 'High-frequency algorithmic trading designed to capture inefficiencies in the crypto market, with a quantitative approach and proven results.',
      capitalMinimo: '5.000 €',
      objetivo: 'Capital Preservation',
      garantia: '100% of Invested Capital',
      caracteristicas: ['Real-time volatility analysis', 'Execution in milliseconds', 'Capital preservation contract'],
      cta: 'Start Classic Strategy',
      mensajeWhatsapp: 'Hello, I am interested in the Classic Bot.',
    },
    {
      id: 'oro',
      tab: 'Premium Gold Bot',
      etiqueta: 'Maximum Protection',
      titulo: 'Titan Gold Dual',
      tipo: 'Dual',
      subetiqueta: 'Crypto + Gold Hedging',
      descripcion: 'Hybrid strategy: when the AI detects turbulence in the crypto market, it rotates capital into GOLD (XAU) as a safe-haven asset.',
      capitalMinimo: '10.000 €',
      tramos: [
        { desde: '10.000 €', tasa: 'up to 7% per year' },
        { desde: '20.000 €', tasa: 'up to 17% per year' },
        { desde: '30.000 €', tasa: 'up to 27% per year' },
      ],
      garantia: 'The initial capital is protected by a guarantee contract. Profits are managed under a custody system that prioritizes their preservation.',
      caracteristicas: ['Automatic portfolio rebalancing', 'Reduced exposure in bear markets', 'Priority technical support'],
      cta: 'Start Titan Gold Strategy',
      mensajeWhatsapp: 'Hello, I am interested in the Premium Gold Bot.',
    },
  ],
  plazos: [
    { cifra: '1 year', etiqueta: 'Minimum Term', nota: 'Recommended' },
    { cifra: '1 - 3 years', etiqueta: 'Optimal Horizon', nota: '' },
    { cifra: '5 years', etiqueta: 'Wealth Plan', nota: '' },
  ],
};

export type Textos = typeof es;
export const TEXTOS: Record<Idioma, Textos> = { es, en };

// Idiomas publicados. Para añadir uno: traducir TEXTOS con el mismo tipo y añadir el código aquí.
export const IDIOMAS: Idioma[] = ['es', 'en'];
export const IDIOMA_DEFECTO: Idioma = 'es';
export const ETIQUETA_IDIOMA: Record<Idioma, string> = { es: 'Español', en: 'English' };

// Cada página tiene su enlace por idioma: /es/terminos, /en/terminos… El idioma por defecto también tiene prefijo
// para que cada enlace sea inequívoco al compartirlo. La raíz / se resuelve según el navegador (ver idioma.tsx).
export const rutaIdioma = (ruta: string, idioma: Idioma) => (ruta === '/' ? `/${idioma}` : `/${idioma}${ruta}`);

// Separa el idioma de la URL: /en/terminos → { idioma: 'en', base: '/terminos' }. Sin prefijo, idioma null.
export function leerRuta(pathname: string): { idioma: Idioma | null; base: string } {
  const [, primero = '', ...resto] = pathname.split('/');
  if ((IDIOMAS as string[]).includes(primero)) {
    return { idioma: primero as Idioma, base: '/' + resto.join('/').replace(/\/$/, '') || '/' };
  }
  return { idioma: null, base: pathname || '/' };
}

// Idioma preferido del navegador: el primero de su lista que publiquemos; si no, el defecto.
export function idiomaDelNavegador(langs: readonly string[]): Idioma {
  for (const l of langs) {
    const codigo = l.toLowerCase().split('-')[0];
    if ((IDIOMAS as string[]).includes(codigo)) return codigo as Idioma;
  }
  return IDIOMA_DEFECTO;
}
