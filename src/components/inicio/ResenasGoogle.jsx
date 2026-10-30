import { buttonClasses } from '../ui/Button.jsx';

const fmtPuntaje = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Estrellas({ valor, tamanio = 18 }) {
  const llenas = Math.round(valor || 0);
  return (
    <span role="img" aria-label={`${valor} de 5 estrellas`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={tamanio} height={tamanio} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
            fill={n <= llenas ? 'var(--color-ink)' : 'none'}
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

const iniciales = (nombre) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

/**
 * Reseñas de Google: puntaje, total y hasta 5 reseñas tal como las devuelve Google (sin filtrar).
 * Atribución a Google y a cada autor, como piden sus condiciones. Sin fotos de los autores:
 * así el navegador del visitante no se conecta a Google.
 */
export default function ResenasGoogle({ datos }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {datos.puntaje != null && <span className="font-display text-[40px] font-semibold leading-none">{fmtPuntaje.format(datos.puntaje)}</span>}
        <span className="flex flex-col gap-1">
          {datos.puntaje != null && <Estrellas valor={datos.puntaje} tamanio={22} />}
          <span className="text-[15px] font-semibold">
            {datos.total} {datos.total === 1 ? 'reseña' : 'reseñas'} en Google
          </span>
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5">
        {datos.resenas.map((r, i) => (
          <figure key={`${r.autor}-${i}`} className="flex flex-col gap-3 rounded-card bg-page p-6">
            {r.estrellas != null && <Estrellas valor={r.estrellas} />}
            <blockquote className="line-clamp-[8] text-[16px] leading-relaxed">{r.texto}</blockquote>
            <figcaption className="mt-auto flex items-center gap-3 pt-2">
              <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-lavanda text-sm font-bold">
                {iniciales(r.autor)}
              </span>
              <span className="flex min-w-0 flex-col">
                {r.autorUrl ? (
                  <a href={r.autorUrl} target="_blank" rel="noopener noreferrer" className="truncate font-semibold underline">
                    {r.autor}
                  </a>
                ) : (
                  <span className="truncate font-semibold">{r.autor}</span>
                )}
                <span className="text-sm text-ink-muted">{r.cuando}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a href={datos.verTodas} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: 'sm' })}>
          Ver todas en Google
        </a>
        <a href={datos.escribir} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variante: 'secundario', size: 'sm' })}>
          Dejar una reseña
        </a>
        <span className="text-sm text-ink-muted">Reseñas de Google</span>
      </div>
    </div>
  );
}
