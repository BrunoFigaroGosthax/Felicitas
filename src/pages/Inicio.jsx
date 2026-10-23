import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../components/ui/Button.jsx';
import Encabezado from '../components/ui/Encabezado.jsx';
import Icono from '../components/ui/Icono.jsx';
import CourseCard from '../components/cursos/CourseCard.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { CONTACTO, SERVICIOS } from '../data/contenido.js';
import { listarObrasSociales, listarTestimonios } from '../services/contenido.js';
import { listarCursos } from '../services/cursos.js';

export default function Inicio() {
  useTitulo();
  const [cursos, setCursos] = useState([]);
  const [testimonios, setTestimonios] = useState([]);
  const [obrasSociales, setObrasSociales] = useState([]);

  useEffect(() => {
    listarCursos()
      .then((todos) => setCursos(todos.filter((c) => c.destacado).slice(0, 3)))
      .catch(() => setCursos([]));
    listarTestimonios().then(setTestimonios);
    listarObrasSociales().then(setObrasSociales);
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-amarillo">
        <svg
          viewBox="0 0 1440 520"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        >
          <path d="M980 -40 C 900 120, 1120 200, 1060 330 S 1180 520, 1320 470 S 1480 300, 1520 380" fill="none" stroke="var(--color-menta)" strokeWidth="34" strokeLinecap="round" />
          <path d="M1500 60 C 1360 40, 1300 170, 1200 140 S 1060 -10, 940 60" fill="none" stroke="var(--color-lavanda)" strokeWidth="34" strokeLinecap="round" />
        </svg>
        <div className="container-page relative flex flex-wrap items-center gap-10 py-12 sm:py-20 lg:py-24">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <p className="eyebrow">Pediatría con propósito</p>
            <h1 className="text-[clamp(38px,5.6vw,64px)] leading-[1.02]">Acompaño la salud de tu hijo en cada etapa</h1>
            <p className="max-w-[520px] text-[clamp(16px,1.6vw,19px)] leading-relaxed">
              Soy Felicitas Pino, pediatra. Atiendo desde los primeros días hasta la adolescencia, con tiempo para
              escucharte y explicarte cada paso.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <ButtonLink to="/turnos" size="lg">Pedir turno</ButtonLink>
              <ButtonLink to="/cursos" size="lg" variante="secundario">Ver cursos</ButtonLink>
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_300px] justify-center">
            <img
              src="/img/felicitas-retrato.jpg"
              alt="Retrato de la Dra. Felicitas Pino, sonriendo, con ambo blanco"
              width="1080"
              height="1080"
              fetchpriority="high"
              className="aspect-square w-full max-w-[420px] rounded-full border-[14px] border-menta bg-lavanda object-cover object-[50%_35%]"
            />
          </div>
        </div>
      </section>

      {/* Sobre mí */}
      <section id="sobre" className="container-page flex scroll-mt-28 flex-wrap items-center gap-10 py-16 lg:gap-16 lg:py-24">
        {/* Foto provisoria de baja resolución (236×295): reemplazar por una de al menos 840×1050. */}
        <img
          src="/img/consultorio.jpg"
          alt="Consultorio pediátrico con escritorio y sillas blancas"
          width="236"
          height="295"
          loading="lazy"
          className="aspect-[4/5] max-h-[520px] min-w-0 flex-[1_1_300px] rounded-card bg-menta object-cover"
        />
        <div className="flex min-w-0 flex-[1.3_1_400px] flex-col gap-4">
          <Encabezado eyebrow="Sobre mí" titulo="Te invito a conocerme" />
          {/* Texto genérico de demostración: reemplazar por la presentación real (formación, experiencia, dónde atiende). */}
          <p className="text-lg leading-relaxed">
            Soy pediatra y acompaño a las familias desde los primeros días del bebé hasta la adolescencia. En cada consulta me tomo el
            tiempo para escucharte, revisar con calma y explicarte cada paso con palabras claras.
          </p>
          <p className="leading-relaxed text-ink-muted">
            Creo en una pediatría cercana y preventiva: que sepas qué esperar en cada etapa, cuándo consultar y cómo cuidar a tu hijo en
            casa. Por eso, además de la consulta, preparo cursos y guías para acompañarte entre visita y visita.
          </p>
          <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
            {[
              ['Matrícula', CONTACTO.matricula],
              ['Atiende', CONTACTO.direccion],
              ['Obras sociales', obrasSociales.length ? `${obrasSociales.join(', ')} y particular` : 'Particular'],
            ].map(([dt, dd]) => (
              <div key={dt} className="rounded-bloque border border-borde bg-card p-4">
                <dt className="text-sm font-medium text-ink-muted">{dt}</dt>
                <dd className="mt-1 font-bold">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Consultas */}
      <section id="consultas" className="scroll-mt-28 border-y border-borde bg-card">
        <div className="container-page flex flex-col gap-8 py-16 lg:py-24">
          <Encabezado eyebrow="Consultas" titulo="¿En qué te puedo ayudar?" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
            {SERVICIOS.map((s) => (
              <article key={s.titulo} className={`flex flex-col gap-2.5 rounded-card p-7 ${s.fondo}`}>
                <Icono nombre={s.icono} size={40} />
                <h3 className="text-2xl leading-tight">{s.titulo}</h3>
                <p className="text-[15px]">{s.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Turnos */}
      <section className="container-page py-16 lg:py-24">
        <div className="flex flex-wrap items-center gap-8 rounded-[32px] bg-lavanda p-7 sm:p-12 lg:p-16">
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
            <h2 className="text-[clamp(30px,3.6vw,44px)] leading-[1.08]">Pedí tu turno online</h2>
            <p className="text-[17px]">
              Elegí el día y el horario que te quedan cómodos. Te llega la confirmación por email y un recordatorio el día anterior.
            </p>
            <div>
              <ButtonLink to="/turnos" size="lg" variante="amarillo">Pedir turno</ButtonLink>
            </div>
          </div>
          <ol className="flex min-w-0 flex-[1_1_340px] flex-col gap-3">
            {['Cargá los datos del paciente', 'Contame el motivo de consulta', 'Elegí día y horario'].map((paso, i) => (
              <li key={paso} className="flex items-center gap-4 rounded-[20px] bg-page px-5 py-4">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-menta font-bold">{i + 1}</span>
                <span className="font-semibold">{paso}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cursos destacados */}
      <section className="container-page flex flex-col gap-8 pb-16 lg:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Encabezado eyebrow="Cursos para familias" titulo="Aprendé a tu ritmo, desde casa" />
          <Link to="/cursos" className="py-2.5 font-bold text-menta-deep underline">Ver todos los cursos</Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-6">
          {cursos.map((c) => (
            <CourseCard key={c.slug} curso={c} />
          ))}
        </div>
      </section>

      {/* Testimonios (la sección no aparece hasta que haya alguno publicado) */}
      {testimonios.length > 0 && (
        <section className="bg-amarillo">
          <div className="container-page flex flex-col gap-8 py-16 lg:py-24">
            <Encabezado titulo="Lo que dicen las familias" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
              {testimonios.map((t, i) => (
                <figure key={i} className="flex flex-col gap-4 rounded-card bg-page p-7">
                  <blockquote className="text-[17px] leading-relaxed">{t.texto}</blockquote>
                  <figcaption className="text-sm font-semibold text-ink-muted">{t.autor}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
