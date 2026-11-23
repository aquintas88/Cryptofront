import { EMAIL_CONTACTO, TELEFONO, TEXTOS, type Idioma } from './textos';
import { IdiomaContext, SelectorIdioma, crearContexto } from './idioma';

export default function Terminos({ idioma }: { idioma: Idioma }) {
  const t = TEXTOS[idioma].terminosPagina;
  const contexto = crearContexto(idioma, '/terminos');
  return (
    <IdiomaContext.Provider value={contexto}>
      <div className="min-h-screen bg-[#f6f3ee] text-[#07152b]">
        <header className="flex items-center justify-between bg-[#07152b] px-6 py-4 text-white">
          <a href={contexto.enlace('/')} className="font-serif text-xl">CRYPTO<span className="text-[#c9a24a]">FRONT</span></a>
          <SelectorIdioma />
        </header>
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8a6a22]">{t.etiqueta}</p>
          <h1 className="mt-3 font-serif text-4xl">{t.titulo}</h1>
          <p className="mt-4 text-slate-600">{t.intro}</p>
          <ol className="mt-10 space-y-8">
            {t.clausulas.map(([titulo, texto], i) => (
              <li key={titulo}>
                <h2 className="font-serif text-xl"><span className="mr-2 text-[#c9a24a]">{i + 1}.</span>{titulo}</h2>
                <p className="mt-2 text-slate-700">{texto}</p>
              </li>
            ))}
          </ol>
          <p className="mt-12 rounded-2xl bg-white p-6 text-sm text-slate-700">
            {t.dudas}{' '}
            <a className="underline" href={`mailto:${EMAIL_CONTACTO}`}>{EMAIL_CONTACTO}</a> · {TELEFONO}
          </p>
        </main>
      </div>
    </IdiomaContext.Provider>
  );
}
