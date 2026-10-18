import { useEffect, useMemo, useState } from 'react';
import CourseCard from '../components/cursos/CourseCard.jsx';
import GrupoOpciones from '../components/ui/GrupoOpciones.jsx';
import OpcionChip from '../components/ui/OpcionChip.jsx';
import Icono from '../components/ui/Icono.jsx';
import { ButtonLink } from '../components/ui/Button.jsx';
import Aviso from '../components/ui/Aviso.jsx';
import { useSesion } from '../context/Sesion.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { listarCursos } from '../services/cursos.js';

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'gratis', label: 'Gratis' },
  { id: 'pago', label: 'Pagos' },
];

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Cursos() {
  useTitulo('Cursos');
  const [cursos, setCursos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const { usuario } = useSesion();
  const [error, setError] = useState('');

  // Se recarga al ingresar o salir: cambia qué cursos figuran como comprados.
  useEffect(() => {
    listarCursos()
      .then(setCursos)
      .catch((e) => setError(e.message));
  }, [usuario?.id]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return cursos.filter((c) => {
      const pasaFiltro = filtro === 'todos' || (filtro === 'gratis' ? c.precio === 0 : c.precio > 0);
      const pasaBusqueda = !q || normalizar(`${c.titulo} ${c.resumen}`).includes(q);
      return pasaFiltro && pasaBusqueda;
    });
  }, [cursos, filtro, busqueda]);

  return (
    <>
      <section className="relative overflow-hidden bg-lavanda">
        <svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
          <path d="M1000 330 C 1040 200, 1180 260, 1220 160 S 1340 -20, 1480 40" fill="none" stroke="var(--color-amarillo)" strokeWidth="30" strokeLinecap="round" />
          <path d="M1180 330 C 1220 260, 1320 300, 1360 220 S 1440 120, 1500 150" fill="none" stroke="var(--color-menta)" strokeWidth="30" strokeLinecap="round" />
        </svg>
        <div className="container-page relative flex flex-col gap-3.5 py-10 sm:py-16 lg:py-20">
          <p className="eyebrow">Cursos para familias</p>
          <h1 className="max-w-[720px] text-[clamp(34px,4.6vw,56px)] leading-[1.04]">
            Respuestas claras para el día a día con tus hijos
          </h1>
          <p className="max-w-[600px] text-lg">
            Guías en PDF y clases en video. Algunas son gratuitas; las pagas quedan disponibles en tu cuenta y retomás
            donde dejaste.
          </p>
        </div>
      </section>

      <div className="container-page flex flex-col gap-7 py-8 sm:py-12 lg:pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <GrupoOpciones aria-label="Filtrar cursos" className="flex flex-wrap gap-2.5">
            {FILTROS.map((f) => (
              <OpcionChip
                key={f.id}
                seleccionado={filtro === f.id}
                onSelect={() => setFiltro(f.id)}
                className="h-11 rounded-full px-5 text-[15px] font-bold"
              >
                {f.label}
              </OpcionChip>
            ))}
          </GrupoOpciones>
          <label className="flex h-12 min-w-0 flex-[0_1_340px] items-center gap-2.5 rounded-full border border-borde bg-card px-4 focus-within:ring-[3px] focus-within:ring-lavanda">
            <Icono nombre="buscar" size={20} className="flex-none text-ink-muted" />
            <span className="sr-only">Buscar cursos</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar: fiebre, sueño, alimentación…"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted/70"
            />
          </label>
        </div>

        <p className="text-sm font-semibold text-ink-muted" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? 'curso' : 'cursos'}
        </p>

        {error ? (
          <Aviso tono="error">{error}</Aviso>
        ) : visibles.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-6">
            {visibles.map((c) => (
              <CourseCard key={c.slug} curso={c} />
            ))}
          </div>
        ) : (
          <p className="rounded-card bg-card p-8 text-center text-ink-muted">
            No encontramos cursos con esa búsqueda. Probá con otra palabra.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-5 rounded-card bg-amarillo p-6 sm:p-10">
          <div className="min-w-0 flex-[1_1_360px]">
            <h2 className="mb-1.5 text-[28px]">¿Tenés una duda puntual sobre tu hijo?</h2>
            <p>Los cursos orientan, pero no reemplazan la consulta. Pedí un turno y lo vemos juntos.</p>
          </div>
          <ButtonLink to="/turnos" size="lg">Pedir turno</ButtonLink>
        </div>
      </div>
    </>
  );
}
