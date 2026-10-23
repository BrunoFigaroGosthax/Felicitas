import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Casilla from '../../components/ui/Casilla.jsx';
import Field from '../../components/ui/Field.jsx';
import { BotonTexto, Estado, Etiqueta, Panel, useAccion, useCarga } from '../../components/admin/ui.jsx';
import {
  aSlug,
  borrarClase,
  borrarCurso,
  crearClase,
  estadoVideo,
  guardarClase,
  guardarCurso,
  moverClase,
  obtenerCursoAdmin,
  quitarPdf,
  quitarPortada,
  quitarVideo,
  subirPdf,
  subirPortada,
  subirVideo,
  verPdf,
} from '../../services/admin.js';
import Ondas from '../../components/ui/Ondas.jsx';

const VACIO = {
  titulo: '',
  slug: '',
  resumen: '',
  descripcion: '',
  formato: 'Video + PDF',
  precio: '0',
  portada_fondo: 'lavanda',
  destacado: false,
  publicado: false,
  otorga_certificado: false,
  orden: '0',
};

// ---------------- Datos del curso ----------------

function FormCurso({ curso, onGuardado }) {
  const nuevo = !curso;
  const navigate = useNavigate();
  const [d, setD] = useState(() => (curso ? { ...VACIO, ...curso, precio: String(curso.precio), orden: String(curso.orden) } : VACIO));
  const [slugManual, setSlugManual] = useState(!nuevo);
  const [errores, setErrores] = useState({});
  const [guardado, setGuardado] = useState(false);
  const { ocupado, error, accion } = useAccion();

  const set = (campo) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setGuardado(false);
    setD((x) => ({ ...x, [campo]: v, ...(campo === 'titulo' && !slugManual ? { slug: aSlug(v) } : {}) }));
  };

  async function guardar(e) {
    e.preventDefault();
    const err = {};
    if (!d.titulo.trim()) err.titulo = 'Escribí el título.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug)) err.slug = 'Solo minúsculas, números y guiones (ej.: fiebre-que-hago).';
    if (!d.resumen.trim()) err.resumen = 'Escribí un resumen corto.';
    if (Number.isNaN(Number(d.precio)) || Number(d.precio) < 0) err.precio = 'Ingresá un precio válido (0 = gratis).';
    setErrores(err);
    if (Object.keys(err).length) return;
    let resultado;
    const ok = await accion(async () => {
      resultado = await guardarCurso(d, curso?.id);
    });
    if (!ok) return;
    if (nuevo) navigate(`/admin/cursos/${resultado.id}`, { replace: true });
    else {
      setGuardado(true);
      onGuardado();
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        <Field label="Título" value={d.titulo} onChange={set('titulo')} error={errores.titulo} />
        <Field
          label="Dirección (URL)"
          value={d.slug}
          onChange={(e) => {
            setSlugManual(true);
            set('slug')(e);
          }}
          error={errores.slug}
          ayuda={`${window.location.host}/cursos/${d.slug || '…'}${!nuevo ? ' · Cambiarla rompe los links ya compartidos.' : ''}`}
        />
      </div>
      <Field label="Resumen (una línea, aparece en la tarjeta)" value={d.resumen} onChange={set('resumen')} error={errores.resumen} />
      <Field label="Descripción (opcional)" as="textarea" rows={3} value={d.descripcion || ''} onChange={set('descripcion')} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
        <Field label="Precio en pesos" type="number" min="0" step="1" value={d.precio} onChange={set('precio')} error={errores.precio} ayuda="0 = gratis" />
        <Field label="Formato" as="select" value={d.formato} onChange={set('formato')}>
          <option>PDF</option>
          <option>Video</option>
          <option>Video + PDF</option>
        </Field>
        <Field label="Color de portada" as="select" value={d.portada_fondo} onChange={set('portada_fondo')}>
          <option value="lavanda">Lavanda</option>
          <option value="menta">Menta</option>
          <option value="amarillo">Amarillo</option>
        </Field>
        <Field label="Orden en el catálogo" type="number" step="1" value={d.orden} onChange={set('orden')} ayuda="Los más bajos van primero." />
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        <Casilla checked={d.publicado} onChange={set('publicado')}>Publicado (visible en la web)</Casilla>
        <Casilla checked={d.destacado} onChange={set('destacado')}>Destacado en la home</Casilla>
        <Casilla checked={d.otorga_certificado} onChange={set('otorga_certificado')}>Da certificado al terminar</Casilla>
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}
      {guardado && <Aviso tono="ok">Cambios guardados.</Aviso>}
      <div>
        <Button type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : nuevo ? 'Crear curso' : 'Guardar cambios'}</Button>
      </div>
    </form>
  );
}

// ---------------- Portada ----------------

const FONDOS = { lavanda: 'bg-lavanda', menta: 'bg-menta', amarillo: 'bg-amarillo' };

function Portada({ curso, onCambio }) {
  const { ocupado, error, accion } = useAccion();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold">Imagen de portada (opcional)</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`h-[110px] w-[200px] flex-none overflow-hidden rounded-bloque ${FONDOS[curso.portada_fondo]}`}>
          {curso.portada_imagen ? (
            <img src={curso.portada_imagen} alt="Portada actual" className="h-full w-full object-cover" />
          ) : (
            <Ondas lineas={curso.portada_ondas?.length ? curso.portada_ondas : [{ trazo: 'a', color: 'menta' }]} />
          )}
        </div>
        <div className="flex flex-col items-start gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-[15px] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
              {ocupado ? 'Subiendo…' : curso.portada_imagen ? 'Cambiar imagen' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={ocupado}
                onChange={async (e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = '';
                  if (archivo && (await accion(() => subirPortada(curso, archivo)))) onCambio();
                }}
              />
            </label>
            {curso.portada_imagen && (
              <BotonTexto peligro disabled={ocupado} onClick={async () => (await accion(() => quitarPortada(curso))) && onCambio()}>
                Quitar
              </BotonTexto>
            )}
          </div>
          <p className="text-sm text-ink-muted">JPG, PNG o WebP, hasta 2 MB. Ideal: 1200 × 630. Sin imagen se usan las ondas del color elegido.</p>
        </div>
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}
    </div>
  );
}

// ---------------- Archivos de una clase ----------------

function ArchivoPdf({ curso, clase, campo, etiqueta, onCambio }) {
  const ruta = clase.medios?.[campo];
  const { ocupado, error, accion } = useAccion();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold">{etiqueta}</p>
      <div className="flex flex-wrap items-center gap-2">
        {ruta ? <Etiqueta tono="ok">Cargado</Etiqueta> : <Etiqueta tono="pendiente">Falta subirlo</Etiqueta>}
        {ruta && <BotonTexto onClick={() => accion(async () => window.open(await verPdf(ruta), '_blank', 'noopener'))}>Ver</BotonTexto>}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-[15px] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
          {ocupado ? 'Subiendo…' : ruta ? 'Reemplazar' : 'Subir PDF'}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={ocupado}
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (archivo && (await accion(() => subirPdf(curso, clase, archivo, campo)))) onCambio();
            }}
          />
        </label>
        {ruta && (
          <BotonTexto peligro disabled={ocupado} onClick={async () => window.confirm('¿Quitar este PDF?') && (await accion(() => quitarPdf(clase, campo))) && onCambio()}>
            Quitar
          </BotonTexto>
        )}
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}
    </div>
  );
}

const TEXTO_ESTADO = { subiendo: 'Subiendo', procesando: 'Bunny lo está procesando', listo: 'Listo', error: 'Error al procesar', 'sin-video': 'Falta subirlo' };
const TONO_ESTADO = { listo: 'ok', error: 'mal', 'sin-video': 'pendiente' };

function ArchivoVideo({ clase, onCambio }) {
  const tiene = Boolean(clase.medios?.bunny_video_id);
  const [consultado, setEstado] = useState(null);
  const estado = tiene ? consultado : { estado: 'sin-video' };
  const [progreso, setProgreso] = useState(null);
  const { ocupado, error, accion } = useAccion();

  // Consulta el estado en Bunny; mientras procesa, vuelve a consultar cada 15 segundos.
  useEffect(() => {
    if (!tiene) return;
    let activo = true;
    let timer;
    const consultar = () =>
      estadoVideo(clase)
        .then((e) => {
          if (!activo) return;
          setEstado(e);
          if (e.estado === 'procesando' || e.estado === 'subiendo') timer = setTimeout(consultar, 15000);
        })
        .catch((e) => activo && setEstado({ estado: 'error', detalle: e.message }));
    consultar();
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [clase, tiene]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold">Video</p>
      <div className="flex flex-wrap items-center gap-2">
        {estado ? <Etiqueta tono={TONO_ESTADO[estado.estado] || 'info'}>{TEXTO_ESTADO[estado.estado]}</Etiqueta> : <Etiqueta>Consultando…</Etiqueta>}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-[15px] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
          {ocupado ? `Subiendo… ${progreso ?? 0} %` : tiene ? 'Reemplazar video' : 'Subir video'}
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={ocupado}
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (!archivo) return;
              setProgreso(0);
              const ok = await accion(() => subirVideo(clase, archivo, setProgreso));
              setProgreso(null);
              if (ok) onCambio();
            }}
          />
        </label>
        {tiene && !ocupado && (
          <BotonTexto peligro onClick={async () => window.confirm('¿Quitar el video? Se borra también de Bunny.') && (await accion(() => quitarVideo(clase))) && onCambio()}>
            Quitar
          </BotonTexto>
        )}
      </div>
      {progreso !== null && (
        <div role="progressbar" aria-label="Subida del video" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso} className="h-2.5 max-w-md overflow-hidden rounded-full bg-lila-suave">
          <div className="h-full rounded-full bg-menta-deep transition-[width]" style={{ width: `${progreso}%` }} />
        </div>
      )}
      {ocupado && <p className="text-sm text-ink-muted">No cierres esta pestaña hasta que termine. Si se corta la conexión, se reintenta solo.</p>}
      {(error || estado?.detalle) && <Aviso tono="error">{error || estado.detalle}</Aviso>}
    </div>
  );
}

// ---------------- Una clase ----------------

function ClaseAdmin({ curso, clase, indice, total, onCambio }) {
  const [d, setD] = useState({
    titulo: clase.titulo,
    descripcion: clase.descripcion || '',
    tipo: clase.tipo,
    muestra: clase.muestra,
    publicada: clase.publicada,
    duracionMin: clase.duracion_segundos ? String(Math.round(clase.duracion_segundos / 60)) : '',
  });
  const [guardada, setGuardada] = useState(false);
  const { ocupado, error, accion } = useAccion();
  const set = (campo) => (e) => {
    setGuardada(false);
    setD((x) => ({ ...x, [campo]: e?.target ? e.target.value : e }));
  };

  return (
    <li className="flex flex-col gap-4 rounded-bloque border border-borde p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xl font-semibold">
          {indice + 1}. {clase.titulo}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <BotonTexto aria-label="Subir de lugar" disabled={indice === 0 || ocupado} onClick={async () => (await accion(() => moverClase(clase.id, -1))) && onCambio()}>
            ↑ Subir
          </BotonTexto>
          <BotonTexto aria-label="Bajar de lugar" disabled={indice === total - 1 || ocupado} onClick={async () => (await accion(() => moverClase(clase.id, 1))) && onCambio()}>
            ↓ Bajar
          </BotonTexto>
          <BotonTexto
            peligro
            disabled={ocupado}
            onClick={async () => window.confirm(`¿Borrar la clase "${clase.titulo}" y sus archivos? No se puede deshacer.`) && (await accion(() => borrarClase(clase))) && onCambio()}
          >
            Borrar
          </BotonTexto>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!d.titulo.trim()) return;
          if (await accion(() => guardarClase(clase.id, d))) {
            setGuardada(true);
            onCambio();
          }
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Field label="Título" value={d.titulo} onChange={set('titulo')} />
          <Field label="Tipo" as="select" value={d.tipo} onChange={set('tipo')}>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
          </Field>
          {d.tipo === 'video' && (
            <Field label="Duración (minutos)" type="number" min="1" value={d.duracionMin} onChange={set('duracionMin')} ayuda="Se completa sola al procesar el video." />
          )}
        </div>
        <Field label="Descripción (opcional)" as="textarea" rows={2} value={d.descripcion} onChange={set('descripcion')} />
        <div className="flex flex-wrap gap-x-8">
          <Casilla checked={d.muestra} onChange={set('muestra')}>Clase de muestra (gratis en un curso pago)</Casilla>
          <Casilla checked={d.publicada} onChange={set('publicada')}>Visible</Casilla>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" variante="secundario" disabled={ocupado}>Guardar clase</Button>
          {guardada && <span className="text-sm font-semibold text-menta-deep">Guardada</span>}
        </div>
      </form>
      {error && <Aviso tono="error">{error}</Aviso>}

      <div className="flex flex-col gap-4 rounded-bloque bg-lila-suave p-4">
        {clase.tipo === 'video' ? (
          <>
            <ArchivoVideo clase={clase} onCambio={onCambio} />
            <ArchivoPdf curso={curso} clase={clase} campo="material_ruta" etiqueta="PDF de apoyo (opcional)" onCambio={onCambio} />
          </>
        ) : (
          <ArchivoPdf curso={curso} clase={clase} campo="pdf_ruta" etiqueta="PDF de la clase" onCambio={onCambio} />
        )}
      </div>
    </li>
  );
}

function NuevaClase({ curso, onCambio }) {
  const [d, setD] = useState({ titulo: '', tipo: 'video', muestra: false });
  const { ocupado, error, accion } = useAccion();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!d.titulo.trim()) return;
        if (await accion(() => crearClase(curso, d))) {
          setD({ titulo: '', tipo: 'video', muestra: false });
          onCambio();
        }
      }}
      className="flex flex-col gap-4 rounded-bloque border-2 border-dashed border-borde p-4 sm:p-5"
    >
      <p className="font-bold">Agregar una clase</p>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Título" value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} className="min-w-0 flex-[2_1_240px]" />
        <Field label="Tipo" as="select" value={d.tipo} onChange={(e) => setD({ ...d, tipo: e.target.value })} className="min-w-0 flex-[1_1_140px]">
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
        </Field>
        <Button type="submit" variante="menta" disabled={ocupado || !d.titulo.trim()}>Agregar</Button>
      </div>
      <Casilla checked={d.muestra} onChange={(v) => setD({ ...d, muestra: v })}>Clase de muestra</Casilla>
      {error && <Aviso tono="error">{error}</Aviso>}
    </form>
  );
}

// ---------------- Página ----------------

export default function AdminCurso() {
  const { id } = useParams();
  const nuevo = id === 'nuevo';
  const navigate = useNavigate();
  const { datos: curso, error, cargando, recargar } = useCarga(() => (nuevo ? Promise.resolve(null) : obtenerCursoAdmin(id)), id);
  const borrado = useAccion();

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/cursos" className="self-start py-2 text-sm font-bold text-menta-deep underline">
        ← Todos los cursos
      </Link>
      <Estado cargando={cargando && !nuevo} error={error}>
        {!nuevo && !curso ? (
          <Aviso tono="error">No encontramos el curso.</Aviso>
        ) : (
          <>
            <Panel
              titulo={nuevo ? 'Nuevo curso' : curso.titulo}
              acciones={
                !nuevo && (
                  <div className="flex flex-wrap items-center gap-2">
                    {curso.publicado && (
                      <Link to={`/cursos/${curso.slug}`} target="_blank" className="py-2 font-bold underline">
                        Ver en la web
                      </Link>
                    )}
                    <BotonTexto
                      peligro
                      disabled={borrado.ocupado}
                      onClick={async () => {
                        if (!window.confirm(`¿Borrar "${curso.titulo}" con todas sus clases y archivos? No se puede deshacer.`)) return;
                        if (await borrado.accion(() => borrarCurso(curso.id))) navigate('/admin/cursos', { replace: true });
                      }}
                    >
                      Borrar curso
                    </BotonTexto>
                  </div>
                )
              }
            >
              {borrado.error && <Aviso tono="error">{borrado.error}</Aviso>}
              {/* key por curso (no por fecha de modificación): subir la portada no borra lo que se está editando. */}
              <FormCurso key={curso?.id || 'nuevo'} curso={curso} onGuardado={recargar} />
              {!nuevo && (
                <div className="border-t border-borde pt-5">
                  <Portada curso={curso} onCambio={recargar} />
                </div>
              )}
            </Panel>

            {!nuevo && (
              <Panel titulo={`Clases (${curso.clases.length})`}>
                <ol className="flex flex-col gap-4">
                  {curso.clases.map((c, i) => (
                    <ClaseAdmin key={`${c.id}-${c.updated_at}`} curso={curso} clase={c} indice={i} total={curso.clases.length} onCambio={recargar} />
                  ))}
                </ol>
                <NuevaClase curso={curso} onCambio={recargar} />
              </Panel>
            )}
          </>
        )}
      </Estado>
    </div>
  );
}
