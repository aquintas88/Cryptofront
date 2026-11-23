// Textos de la web pública. Titulares, etiquetas, cifras y campos son los del sitio actual.
// Los párrafos largos están reescritos con el mismo contenido: sustituir por la copia exacta cuando se tenga.
export const WHATSAPP = 'https://wa.me/34615608565';
export const EMAIL_CONTACTO = 'infocryptofront@gmail.com';
export const TELEFONO = '615 608 565';

export const ESTRATEGIAS = [
  {
    id: 'clasico',
    tab: 'Bot Clásico (Crypto)',
    etiqueta: 'Rendimiento Constante',
    titulo: 'Arbitraje Alpha',
    tipo: 'Crypto',
    subetiqueta: 'Alta Frecuencia',
    descripcion:
      'Operativa algorítmica de alta frecuencia diseñada para aprovechar ineficiencias del mercado cripto, con un enfoque cuantitativo y resultados probados.',
    capitalMinimo: '5.000 €',
    objetivo: 'Preservación de Capital',
    garantia: '100% del Capital Invertido',
    caracteristicas: [
      'Análisis de volatilidad en tiempo real',
      'Ejecución en milisegundos',
      'Contrato de preservación de capital',
    ],
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
    descripcion:
      'Estrategia híbrida: cuando la IA detecta turbulencias en el mercado cripto, rota el capital hacia ORO (XAU) como activo refugio.',
    capitalMinimo: '10.000 €',
    tramos: [
      { desde: '10.000 €', tasa: 'hasta 7% anual' },
      { desde: '20.000 €', tasa: 'hasta 17% anual' },
      { desde: '30.000 €', tasa: 'hasta 27% anual' },
    ],
    garantia:
      'El capital inicial queda protegido mediante contrato de garantía. Los beneficios se gestionan bajo un sistema de custodia que prioriza su conservación.',
    caracteristicas: [
      'Rebalanceo automático de cartera',
      'Exposición reducida en mercados bajistas',
      'Prioridad en soporte técnico',
    ],
    cta: 'Iniciar Estrategia Titan Gold',
    mensajeWhatsapp: 'Hola, estoy interesado en el Bot de Oro Premium.',
  },
];

export const PLAZOS = [
  { cifra: '1 año', etiqueta: 'Plazo Mínimo', nota: 'Recomendado' },
  { cifra: '1 - 3 años', etiqueta: 'Horizonte Óptimo', nota: '' },
  { cifra: '5 años', etiqueta: 'Plan Patrimonial', nota: '' },
];
