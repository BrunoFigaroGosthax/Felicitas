import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Estado, Etiqueta, Panel, Tabla, useCarga } from '../../components/admin/ui.jsx';
import { listarCursosAdmin } from '../../services/admin.js';
import { pesos } from '../../services/formato.js';

export default function AdminCursos() {
  const { datos, error, cargando } = useCarga(listarCursosAdmin);

  return (
    <Panel titulo="Cursos" acciones={<ButtonLink to="/admin/cursos/nuevo" size="sm">Nuevo curso</ButtonLink>}>
      <Estado cargando={cargando} error={error}>
        <Tabla
          filas={datos || []}
          clave={(c) => c.id}
          vacio="Todavía no hay cursos. Creá el primero."
          columnas={[
            {
              titulo: 'Curso',
              render: (c) => (
                <Link to={`/admin/cursos/${c.id}`} className="font-bold underline underline-offset-4">
                  {c.titulo}
                </Link>
              ),
            },
            {
              titulo: 'Estado',
              render: (c) => (
                <span className="flex flex-wrap gap-1.5">
                  <Etiqueta tono={c.publicado ? 'ok' : 'neutro'}>{c.publicado ? 'Publicado' : 'Borrador'}</Etiqueta>
                  {c.destacado && <Etiqueta tono="info">En la home</Etiqueta>}
                </span>
              ),
            },
            { titulo: 'Precio', render: (c) => (Number(c.precio) === 0 ? 'Gratis' : pesos(Number(c.precio))) },
            { titulo: 'Clases', render: (c) => c.clases.length },
            { titulo: 'Ventas', render: (c) => (c.vendidas ? `${c.vendidas} · ${pesos(c.recaudado)}` : '—') },
          ]}
        />
      </Estado>
    </Panel>
  );
}
