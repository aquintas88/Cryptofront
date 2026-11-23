import { EMAIL_CONTACTO, TELEFONO } from './contenido';

const CLAUSULAS = [
  ['Objeto del Servicio', 'Gestión de inversiones en activos digitales mediante software propio de trading algorítmico. CryptoFront actúa como gestor técnico del capital del cliente.'],
  ['Advertencia de Riesgo y Cobertura', 'Los mercados de criptoactivos presentan volatilidad inherente. Las estrategias de diversificación y cobertura (por ejemplo, el Bot de Oro) buscan moderarla. Garantía de Capital: el capital inicial aportado está garantizado contractualmente y el cliente no asumirá pérdidas sobre su depósito inicial al finalizar el periodo pactado.'],
  ['Mecanismo de Garantía', 'La garantía se formaliza mediante un contrato legal vinculante. Si el balance final es inferior al depósito, CryptoFront repone la diferencia para asegurar el 100% del capital aportado.'],
  ['Estructura de Comisiones', 'Modelo de comisión de éxito (performance fee). Se aplica únicamente sobre las ganancias netas generadas, nunca sobre el capital principal.'],
  ['Requisitos del Inversor', 'El inversor declara ser mayor de edad, tener capacidad legal y haber leído la documentación de riesgo.'],
  ['Legislación y Jurisdicción', 'Se rige por las leyes de España. Para cualquier controversia son competentes los juzgados y tribunales de Madrid.'],
];

export default function Terminos() {
  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#07152b]">
      <header className="bg-[#07152b] px-6 py-4 text-white">
        <a href="/" className="font-serif text-xl">CRYPTO<span className="text-[#c9a24a]">FRONT</span></a>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8a6a22]">Aviso Legal</p>
        <h1 className="mt-3 font-serif text-4xl">Términos y Condiciones</h1>
        <p className="mt-4 text-slate-600">El acceso y el uso de los servicios de gestión patrimonial de CryptoFront implica la aceptación plena de estos términos.</p>
        <ol className="mt-10 space-y-8">
          {CLAUSULAS.map(([titulo, texto], i) => (
            <li key={titulo}>
              <h2 className="font-serif text-xl"><span className="mr-2 text-[#c9a24a]">{i + 1}.</span>{titulo}</h2>
              <p className="mt-2 text-slate-700">{texto}</p>
            </li>
          ))}
        </ol>
        <p className="mt-12 rounded-2xl bg-white p-6 text-sm text-slate-700">
          ¿Dudas legales? Contacte con nuestro departamento jurídico:{' '}
          <a className="underline" href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a> · {TELEFONO}
        </p>
      </main>
    </div>
  );
}
