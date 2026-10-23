import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button, { ButtonLink } from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Icono from '../components/ui/Icono.jsx';
import { useSesion } from '../context/Sesion.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { actualizarPerfil, obtenerPerfil, salir } from '../services/auth.js';
import { misCertificados, misCursos } from '../services/cursos.js';

const fmtFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

function Seccion({ titulo, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-borde bg-card p-5 sm:p-8">
      <h2 className="text-[26px] leading-tight">{titulo}</h2>
      {children}
    </section>
  );
}

/** ocultarSiVacio: para administradores, que casi nunca tienen cursos propios. */
function MisCursos({ ocultarSiVacio }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    misCursos().then(setLista).catch((e) => setError(e.message));
  }, []);

  if (ocultarSiVacio && (!lista || !lista.length)) return null;
  let contenido;
  if (error) contenido = <Aviso tono="error">{error}</Aviso>;
  else if (!lista) contenido = <p className="text-ink-muted">Cargando tus cursos…</p>;
  else if (!lista.length) {
    contenido = (
      <div className="flex flex-col items-start gap-3">
        <p>Todavía no empezaste ningún curso.</p>
        <ButtonLink to="/cursos" variante="menta" size="sm">Ver cursos</ButtonLink>
      </div>
    );
  }
  return <Seccion titulo="Mis cursos">{contenido ?? <ListaCursos lista={lista} />}</Seccion>;
}

function ListaCursos({ lista }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
      {lista.map(({ curso, completadas, total }) => {
        const pct = Math.round((completadas / total) * 100);
        return (
          <li key={curso.id} className="flex flex-col gap-3 rounded-bloque border border-borde p-4">
            <p className="font-bold leading-snug">{curso.titulo}</p>
            <div
              role="progressbar"
              aria-label={`Progreso de ${curso.titulo}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2.5 overflow-hidden rounded-full bg-lila-suave"
            >
              <div className="h-full rounded-full bg-menta-deep" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm font-medium text-ink-muted">{completadas} de {total} clases</p>
            <ButtonLink to={`/cursos/${curso.slug}`} size="sm" className="mt-auto self-start">
              {completadas === total ? 'Repasar' : completadas ? 'Continuar' : 'Empezar'}
            </ButtonLink>
          </li>
        );
      })}
    </ul>
  );
}

function MisCertificados({ ocultarSiVacio }) {
  const [lista, setLista] = useState(null);
  useEffect(() => {
    misCertificados().then(setLista).catch(() => setLista([]));
  }, []);
  if (ocultarSiVacio && (!lista || !lista.length)) return null;
  let contenido;
  if (!lista) contenido = <p className="text-ink-muted">Cargando…</p>;
  else if (!lista.length) contenido = <p className="text-ink-muted">Cuando termines un curso que otorga certificado, lo vas a encontrar acá.</p>;
  return <Seccion titulo="Mis certificados">{contenido ?? <ListaCertificados lista={lista} />}</Seccion>;
}

function ListaCertificados({ lista }) {
  return (
    <ul className="flex flex-col gap-2">
      {lista.map((c) => (
        <li key={c.codigo}>
          <Link to={`/certificados/${c.codigo}`} className="flex items-center gap-3 rounded-bloque p-3 hover:bg-lila-suave">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amarillo">
              <Icono nombre="documento" size={20} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-bold underline">{c.curso_titulo}</span>
              <span className="text-sm text-ink-muted">
                {fmtFecha.format(new Date(c.emitido_at))} · Código {c.codigo}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Nombre, teléfono y cambio de contraseña. También lo usa el panel (Admin → Mis datos). */
export function MisDatos({ email }) {
  const [datos, setDatos] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState({ tono: '', texto: '' });

  useEffect(() => {
    obtenerPerfil()
      .then(setDatos)
      .catch((e) => setEstado({ tono: 'error', texto: e.message }));
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setEstado({ tono: '', texto: '' });
    try {
      await actualizarPerfil(datos);
      setEstado({ tono: 'ok', texto: 'Guardamos tus datos.' });
    } catch (e2) {
      setEstado({ tono: 'error', texto: e2.message });
    } finally {
      setGuardando(false);
    }
  }

  if (!datos) return estado.texto ? <Aviso tono="error">{estado.texto}</Aviso> : <p className="text-ink-muted">Cargando…</p>;
  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
        <Field label="Nombre y apellido" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} autoComplete="name" ayuda="Es el que figura en tus certificados." />
        <Field label="Teléfono (opcional)" type="tel" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} autoComplete="tel" />
        <Field label="Email" value={email} readOnly disabled ayuda="Para cambiarlo, escribinos." />
      </div>
      {estado.texto && <Aviso tono={estado.tono}>{estado.texto}</Aviso>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Button>
        <ButtonLink to="/nueva-clave" variante="secundario">Cambiar contraseña</ButtonLink>
      </div>
    </form>
  );
}

export default function MiCuenta() {
  useTitulo('Mi cuenta');
  const { usuario, esAdmin } = useSesion();
  const { state } = useLocation();
  const navigate = useNavigate();

  async function cerrarSesion() {
    await salir();
    navigate('/', { replace: true });
  }

  return (
    <div className="container-page flex flex-col gap-7 py-10 sm:py-14 lg:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(34px,4.4vw,52px)] leading-[1.05]">Mi cuenta</h1>
          <p className="text-ink-muted">{usuario.email}</p>
        </div>
        <Button variante="secundario" size="sm" onClick={cerrarSesion}>Cerrar sesión</Button>
      </div>
      {state?.aviso && <Aviso tono="ok">{state.aviso}</Aviso>}
      {esAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-lavanda p-5 sm:p-7">
          <div className="flex flex-col gap-1">
            <p className="font-display text-[22px] font-semibold leading-tight">Tu cuenta es administradora</p>
            <p className="text-[15px]">Cursos, ventas, alumnos, turnos y contenido se gestionan desde el panel.</p>
          </div>
          <ButtonLink to="/admin" variante="amarillo">Ir al panel</ButtonLink>
        </div>
      )}
      <MisCursos ocultarSiVacio={esAdmin} />
      <MisCertificados ocultarSiVacio={esAdmin} />
      <Seccion titulo="Mis datos"><MisDatos email={usuario.email} /></Seccion>
    </div>
  );
}
