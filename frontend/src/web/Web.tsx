import { useEffect, useRef, useState } from 'react';
import { ESTRATEGIAS, PLAZOS, WHATSAPP, EMAIL_CONTACTO, TELEFONO } from './contenido';

// Revela el elemento al entrar en pantalla (sin efecto si el usuario pide movimiento reducido).
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { el?.classList.add('in'); return; }
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

// Iluminación que sigue al cursor sobre tarjetas.
function spotMove(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
}

const enlaceWhatsapp = (mensaje?: string) =>
  mensaje ? `${WHATSAPP}?text=${encodeURIComponent(mensaje)}` : WHATSAPP;

function Cabecera() {
  const [scroll, setScroll] = useState(false);
  useEffect(() => {
    const f = () => setScroll(window.scrollY > 24);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={`cabecera-scroll sticky top-0 z-40 border-b border-white/10 backdrop-blur ${scroll ? 'bg-[#07152b]/95 shadow-2xl shadow-black/30' : 'bg-[#07152b]/85'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/" className="font-serif text-xl tracking-wide text-white">
          CRYPTO<span className="text-[#c9a24a]">FRONT</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#nuestros-bots" className="hover:text-white">Estrategias</a>
          <a href="#inversiones-garantia" className="hover:text-white">Seguridad</a>
          <a href="#contacto" className="hover:text-white">Contacto</a>
          <a href="/terminos" className="hover:text-white">Aviso legal</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/acceso" className="hidden rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10 sm:inline-block">
            Área de clientes
          </a>
          <a href={enlaceWhatsapp('Hola CryptoFront, deseo información sobre gestión patrimonial.')}
            className="rounded-full bg-[#c9a24a] px-4 py-2 text-sm font-semibold text-[#07152b]">WhatsApp</a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const capa = useRef<HTMLDivElement>(null);
  const raton = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido) return;
    const scroll = () => {
      if (capa.current) capa.current.style.transform = `translate3d(0,${window.scrollY * 0.25}px,0)`;
    };
    const mover = (e: MouseEvent) => {
      if (raton.current) {
        const x = (e.clientX / window.innerWidth - 0.5) * 16;
        const y = (e.clientY / window.innerHeight - 0.5) * 12;
        raton.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('mousemove', mover, { passive: true });
    return () => {
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('mousemove', mover);
    };
  }, []);
  return (
    <section className="relative overflow-hidden bg-[#07152b] text-white">
      <div ref={capa} className="absolute -inset-y-16 inset-x-0 will-change-transform">
        <div ref={raton} className="h-full w-full transition-transform duration-500 ease-out">
          <img src="/hero-global.png" alt="" aria-hidden="true" className="fondo-vivo h-full w-full object-cover opacity-90" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#07152b] via-[#07152b]/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07152b] to-transparent" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 md:py-36">
        <div>
          <p className="entrar text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a24a]">Excelencia en Trading Algorítmico</p>
          <h1 className="entrar entrar-2 mt-5 font-serif text-5xl leading-[1.05] md:text-7xl">
            Preservación y <span className="texto-dorado italic">Crecimiento</span> de su Patrimonio
          </h1>
          <p className="entrar entrar-3 mt-7 max-w-xl text-lg leading-relaxed text-white/70">
            Combinamos la experiencia de los mercados institucionales con inteligencia artificial para buscar rendimientos consistentes
            y un marco jurídico claro.
          </p>
          <div className="entrar entrar-4 mt-10 flex flex-wrap gap-4">
            <a href="#nuestros-bots" className="rounded-full bg-[#c9a24a] px-7 py-3.5 font-semibold text-[#07152b] transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#c9a24a]/40">Explorar Carteras</a>
            <a href="#inversiones-garantia" className="rounded-full border border-white/25 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10">
              Protocolo de Seguridad
            </a>
          </div>
        </div>
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-4 px-6 pb-16 md:grid-cols-3">
        {[
          ['01', 'IA Propietaria', 'Algoritmos que operan 24/7, sin sesgos emocionales.'],
          ['02', 'Gestión Activa', 'Seguimiento permanente de riesgo financiero y ciberseguridad.'],
          ['03', 'Transparencia Operativa', '100%'],
        ].map(([n, t, d]) => (
          <Reveal key={t}>
            <div className="spot h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur borde-interior transition hover:-translate-y-1 hover:border-[#c9a24a]/50" onMouseMove={spotMove}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#c9a24a]">{t}</h3>
                <span className="font-mono text-xs text-white/30">{n}</span>
              </div>
              {d === '100%' ? <p className="texto-dorado mt-2 font-serif text-4xl">100%</p> : <p className="mt-2 text-white/70">{d}</p>}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// Franja en movimiento continuo entre el hero y el bloque de confianza.
function Franja() {
  const items = ['Trading algorítmico', 'Inteligencia artificial', 'Gestión activa', 'Transparencia operativa', 'Seguridad jurídica', 'Capital protegido por contrato'];
  const fila = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-[#0b0b0c] py-5" aria-hidden="true">
      <div className="marquesina gap-12">
        {fila.map((t, i) => (
          <span key={i} className="flex items-center gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.2em] text-white/60">
            {t}<span className="h-1.5 w-1.5 rounded-full bg-[#c9a24a]" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Confianza() {
  return (
    <section className="bg-[#f6f3ee] py-20 text-[#07152b]">
      <Reveal className="mx-auto max-w-7xl px-6">
        <p className="font-mono text-xs text-[#8a6a22]">01 — CONFIANZA</p>
        <h2 className="mt-3 font-serif text-5xl">Una Institución de Confianza Digital</h2>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
          Nuestro equipo tiene décadas de experiencia en mercados tradicionales. Llevamos ese rigor financiero al mundo digital y
          eliminamos el error humano de la ecuación.
        </p>
      </Reveal>
    </section>
  );
}

function Bots() {
  const [activa, setActiva] = useState(ESTRATEGIAS[0].id);
  const e = ESTRATEGIAS.find((x) => x.id === activa)!;
  return (
    <section id="nuestros-bots" className="bg-white py-24 text-[#07152b]">
      <div className="mx-auto max-w-7xl px-6">
        <p className="font-mono text-xs text-[#8a6a22]">02 — ESTRATEGIAS</p>
        <h2 className="mt-3 font-serif text-5xl">Estrategias de Inversión</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Elija el vehículo de inversión que mejor se adapte a su perfil de riesgo y a sus objetivos financieros.
        </p>
        <div className="mt-10 inline-flex rounded-full bg-slate-100 p-1">
          {ESTRATEGIAS.map((x) => (
            <button key={x.id} onClick={() => setActiva(x.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${activa === x.id ? 'bg-[#07152b] text-white shadow' : 'text-slate-600'}`}>
              {x.tab}
            </button>
          ))}
        </div>
        <article onMouseMove={spotMove} className="spot mt-8 grid gap-8 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm transition hover:shadow-2xl md:grid-cols-5 md:p-10">
          <div className="md:col-span-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest">
              <span className="rounded-full bg-[#c9a24a]/15 px-3 py-1 text-[#8a6a22]">{e.etiqueta}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{e.tipo}</span>
              <span className="text-slate-400">{e.subetiqueta}</span>
            </div>
            <h3 className="mt-4 font-serif text-3xl">{e.titulo}</h3>
            <p className="mt-3 text-slate-600">{e.descripcion}</p>
            <ul className="mt-6 space-y-2">
              {e.caracteristicas.map((c) => (
                <li key={c} className="flex gap-2 text-sm"><span className="text-[#c9a24a]">✦</span>{c}</li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <dl className="space-y-4 rounded-2xl bg-[#07152b] p-6 text-white">
              <div><dt className="text-xs uppercase tracking-widest text-white/50">Capital Mínimo</dt><dd className="font-serif text-2xl">{e.capitalMinimo}</dd></div>
              {'objetivo' in e && (
                <div><dt className="text-xs uppercase tracking-widest text-white/50">Objetivo</dt><dd>{e.objetivo}</dd></div>
              )}
              {'garantia' in e && typeof e.garantia === 'string' && e.garantia.startsWith('100%') && (
                <div><dt className="text-xs uppercase tracking-widest text-white/50">Garantía</dt><dd>{e.garantia}</dd></div>
              )}
              {'tramos' in e && (
                <div>
                  <dt className="text-xs uppercase tracking-widest text-white/50">Rentabilidad objetivo anual</dt>
                  <dd className="mt-2 space-y-2">
                    {e.tramos!.map((t) => (
                      <p key={t.desde} className="flex justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                        <span>{t.desde}</span><span className="font-semibold text-[#c9a24a]">{t.tasa}</span>
                      </p>
                    ))}
                  </dd>
                </div>
              )}
              {'garantia' in e && typeof e.garantia === 'string' && !e.garantia.startsWith('100%') && (
                <div><dt className="text-xs uppercase tracking-widest text-white/50">Garantía</dt><dd className="text-sm text-white/80">{e.garantia}</dd></div>
              )}
            </dl>
            <a href={enlaceWhatsapp(e.mensajeWhatsapp)} className="mt-6 block rounded-full bg-[#c9a24a] py-3 text-center font-semibold text-[#07152b] transition hover:brightness-110 hover:shadow-lg hover:shadow-[#c9a24a]/30">
              {e.cta}
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}

function Seguridad() {
  return (
    <section id="inversiones-garantia" className="relative overflow-hidden bg-[#07152b] py-24 text-white">
      <img src="/hero-mercados.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07152b] via-[#07152b]/80 to-[#07152b]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <p className="font-mono text-xs text-[#c9a24a]">03 — SEGURIDAD</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a24a]">Seguridad de Grado Institucional</p>
        <h2 className="mt-3 font-serif text-4xl">Capital Protegido por Contrato</h2>
        <p className="mt-4 max-w-3xl text-white/70">
          Una doble capa: un contrato de garantía jurídica reforzado por una póliza de cobertura. Si hubiera pérdidas técnicas, el
          mecanismo prevé la reposición total de los fondos aportados.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLAZOS.map((p) => (
            <Reveal key={p.cifra}><div className="spot rounded-2xl border border-white/10 bg-white/5 p-8 transition hover:-translate-y-1 hover:border-[#c9a24a]/40" onMouseMove={spotMove}>
              <p className="font-serif text-4xl">{p.cifra}</p>
              <p className="mt-2 text-white/70">{p.etiqueta}</p>
              {p.nota && <span className="mt-4 inline-block rounded-full bg-[#c9a24a] px-3 py-1 text-xs font-bold text-[#07152b]">{p.nota}</span>}
            </div></Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Formulario() {
  const [enviado, setEnviado] = useState(false);
  const campo = (nombre: string, etiqueta: string, tipo = 'text') => (
    <label className="block text-sm">
      <span className="text-slate-700">{etiqueta} *</span>
      <input name={nombre} type={tipo} required className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:border-[#c9a24a] focus:outline-none focus:ring-4 focus:ring-[#c9a24a]/20" />
    </label>
  );
  return (
    <section id="contacto" className="bg-[#f6f3ee] py-24 text-[#07152b]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2">
        <div>
          <p className="font-mono text-xs text-[#8a6a22]">04 — CONTACTO</p>
          <h2 className="mt-3 font-serif text-5xl">Solicitar Consultoría Privada</h2>
          <p className="mt-3 text-slate-600">Atención exclusiva y personalizada.</p>
          <p className="mt-8 text-sm text-slate-600">Teléfono: {TELEFONO} · {EMAIL_CONTACTO}</p>
        </div>
        <form
          className="space-y-4 rounded-3xl bg-white p-8 shadow-sm"
          onSubmit={(e) => { e.preventDefault(); setEnviado(true); }}
        >
          {enviado ? (
            <div>
              <h3 className="font-serif text-2xl">Solicitud Recibida</h3>
              <p className="mt-2 text-slate-600">
                Gracias por contactar con CryptoFront. Nuestro equipo de asesores revisará su perfil y se pondrá en contacto a la brevedad.
              </p>
              <p className="mt-4 text-xs text-slate-500">Entorno de pruebas: el formulario aún no envía solicitudes a ningún sistema.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {campo('nombre', 'Nombre')}
                {campo('apellido', 'Apellido')}
              </div>
              {campo('email', 'Email Corporativo / Personal', 'email')}
              {campo('telefono', 'Teléfono', 'tel')}
              <label className="block text-sm">
                <span className="text-slate-700">Detalle de su Consulta *</span>
                <textarea name="detalle" required rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:border-[#c9a24a] focus:outline-none focus:ring-4 focus:ring-[#c9a24a]/20" />
              </label>
              <label className="flex gap-3 text-sm text-slate-600">
                <input type="checkbox" required className="mt-1" />
                <span>He leído y acepto los <a href="/terminos" className="underline">Términos y Condiciones</a> y la Política de Privacidad. *</span>
              </label>
              <button className="w-full rounded-full bg-[#07152b] py-3 font-semibold text-white transition hover:bg-[#0d2240] hover:shadow-lg">Enviar Solicitud de Apertura</button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function Pie() {
  return (
    <footer className="bg-[#07152b] py-10 text-sm text-white/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6">
        <span className="font-serif text-white">CRYPTO<span className="text-[#c9a24a]">FRONT</span></span>
        <span>{EMAIL_CONTACTO} · {TELEFONO}</span>
        <a href="/terminos" className="hover:text-white">Términos y Condiciones</a>
      </div>
    </footer>
  );
}

export default function Web() {
  return (
    <div className="min-h-screen scroll-smooth font-sans">
      <Cabecera />
      <Hero />
      <Franja />
      <Confianza />
      <Bots />
      <Seguridad />
      <Formulario />
      <Pie />
    </div>
  );
}
