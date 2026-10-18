import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Ondas from '../ui/Ondas.jsx';
import { buttonClasses } from '../ui/Button.jsx';
import { metaCurso } from '../../services/formato.js';

const fondos = { lavanda: 'bg-lavanda', menta: 'bg-menta', amarillo: 'bg-amarillo' };

export default function CourseCard({ curso }) {
  const gratis = curso.precio === 0;
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-borde bg-card shadow-soft">
      <div className={`h-[150px] overflow-hidden ${fondos[curso.portada.fondo]}`}>
        {curso.portada.imagen ? (
          <img src={curso.portada.imagen} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Ondas lineas={curso.portada.ondas} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tono={gratis ? 'gratis' : 'pago'}>{gratis ? 'Gratis' : 'Pago'}</Badge>
          <Badge>{curso.formato}</Badge>
        </div>
        <h3 className="text-2xl leading-tight">{curso.titulo}</h3>
        <p className="text-[15px]">{curso.resumen}</p>
        <p className="text-sm font-medium text-ink-muted">{metaCurso(curso)}</p>
        <Link
          to={`/cursos/${curso.slug}`}
          className={buttonClasses({ variante: gratis ? 'menta' : 'primario', size: 'sm', className: 'mt-auto self-start' })}
        >
          {gratis ? 'Acceder' : curso.comprado ? 'Continuar' : 'Ver curso'}
        </Link>
      </div>
    </article>
  );
}
