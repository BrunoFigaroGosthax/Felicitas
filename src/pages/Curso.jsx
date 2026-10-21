import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button, { ButtonLink } from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Icono from '../components/ui/Icono.jsx';
import Ondas from '../components/ui/Ondas.jsx';
import NoEncontrada from './NoEncontrada.jsx';
import { useSesion } from '../context/Sesion.jsx';
import useProgreso from '../hooks/useProgreso.js';
import useTitulo from '../hooks/useTitulo.js';
import { USE_MOCKS } from '../lib/entorno.js';
import { useReproductor } from '../lib/reproductor.js';
import { supabase } from '../lib/supabase.js';
import { calcularPrecio, comprar, emitirCertificado, obtenerCurso, obtenerMedio, puedeVerClase } from '../services/cursos.js';
import { pesos, precioTexto } from '../services/formato.js';

/** URLs firmadas (Bunny) de la clase actual: { medio, error }. */
function useMedio(clase, habilitada) {
  const [estado, setEstado] = useState({ medio: null, error: '' });
  useEffect(() => {
    if (!clase || !habilitada) return;
    let activo = true;
    setEstado({ medio: null, error: '' });
    obtenerMedio(clase)
      .then((medio) => activo && setEstado({ medio, error: '' }))
      .catch((e) => activo && setEstado({ medio: null, error: e.message }));
    return () => {
      activo = false;
    };
  }, [clase, habilitada]);
  return estado;
}

const volverAca = (pathname) => `/ingresar?volver=${encodeURIComponent(pathname)}`;

function Reproductor({ clase, habilitada, medio, error, inicio, on }) {
  const iframeRef = useRef(null);
  const src = habilitada && clase.tipo === 'video' ? medio?.video : null;
  useReproductor(iframeRef, src, inicio, on);

  if (src) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-card bg-ink">
        <iframe
          ref={iframeRef}
          src={src}
          title={clase.titulo}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  let contenido;
  if (!habilitada) {
    contenido = (
      <div className="flex max-w-[360px] flex-col items-center gap-2.5 rounded-3xl bg-page p-6 text-center">
        <Icono nombre="candado" size={32} />
        <p className="font-bold">Esta clase es parte del curso pago</p>
        <p className="text-sm text-ink-muted">Mirá gratis la clase de muestra o comprá el curso completo.</p>
      </div>
    );
  } else if (error) {
    contenido = <p className="max-w-[420px] rounded-3xl bg-page p-6 text-center font-medium">{error}</p>;
  } else if (!USE_MOCKS && !medio) {
    contenido = <p className="rounded-3xl bg-page px-6 py-4 font-medium">Cargando…</p>;
  } else if (clase.tipo === 'pdf') {
    contenido = medio?.pdf ? (
      <a href={medio.pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[20px] bg-page px-6 py-4 font-bold">
        <Icono nombre="documento" /> Abrir el PDF
      </a>
    ) : (
      <p className="flex items-center gap-3 rounded-[20px] bg-page px-6 py-4 font-bold">
        <Icono nombre="documento" /> {USE_MOCKS ? 'Acá se abre el PDF de la clase' : 'El PDF todavía no está disponible.'}
      </p>
    );
  } else if (USE_MOCKS) {
    // Modo demo: botón ilustrativo en lugar del reproductor.
    contenido = (
      <span aria-hidden="true" className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-ink">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="var(--color-amarillo)">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    );
  } else {
    contenido = <p className="rounded-3xl bg-page px-6 py-4 font-medium">El video todavía no está disponible.</p>;
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-lavanda">
      <div className="absolute inset-0">
        <Ondas lineas={[{ trazo: 'b', color: 'amarillo' }, { trazo: 'a', color: 'menta' }]} grosor={14} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">{contenido}</div>
    </div>
  );
}

function CajaCompra({ curso, onComprado }) {
  const { usuario } = useSesion();
  const { pathname } = useLocation();
  const [codigo, setCodigo] = useState('');
  const [verCodigo, setVerCodigo] = useState(false);
  const [precio, setPrecio] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState('');
  const [comprando, setComprando] = useState(false);
  const [error, setError] = useState('');

  async function aplicar(e) {
    e.preventDefault();
    if (!codigo.trim()) return setErrorCodigo('Escribí el código.');
    setAplicando(true);
    setErrorCodigo('');
    try {
      setPrecio(await calcularPrecio(curso, codigo.trim()));
    } catch (e2) {
      setPrecio(null);
      setErrorCodigo(e2.message);
    } finally {
      setAplicando(false);
    }
  }

  async function comprarCurso() {
    setComprando(true);
    setError('');
    try {
      const r = await comprar(curso, precio?.conCupon ? codigo.trim() : undefined);
      if (r.url) return window.location.assign(r.url); // a Mercado Pago
      onComprado();
    } catch (e2) {
      setError(e2.message);
      setComprando(false);
    }
  }

  const pct = precio?.conCupon ? Math.round((precio.descuento / precio.precioLista) * 100) : 0;
  const precioFinal = !precio?.conCupon
    ? precioTexto(curso)
    : precio.monto === 0
      ? 'Sin cargo'
      : curso.precioTexto
        ? `${curso.precioTexto} −${pct} %`
        : pesos(precio.monto);

  return (
    <div className="flex flex-col gap-3 rounded-card bg-amarillo p-6">
      <h2 className="text-[26px]">{curso.titulo}</h2>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-[34px] font-semibold">{precioFinal}</span>
        {precio?.conCupon && <s className="text-ink-muted">{precioTexto(curso)}</s>}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px]">
        <li>{curso.clases.length} clases</li>
        <li>Material descargable en PDF</li>
        <li>Retomás donde dejaste</li>
        {curso.otorgaCertificado && <li>Certificado al terminar</li>}
      </ul>

      {usuario ? (
        <>
          {verCodigo ? (
            <form onSubmit={aplicar} noValidate className="flex flex-wrap items-end gap-2">
              <Field
                label="Código de descuento"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value);
                  setPrecio(null);
                }}
                error={errorCodigo}
                autoComplete="off"
                className="min-w-0 flex-[1_1_160px]"
              />
              <Button type="submit" variante="secundario" disabled={aplicando}>{aplicando ? '…' : 'Aplicar'}</Button>
            </form>
          ) : (
            <button type="button" onClick={() => setVerCodigo(true)} className="min-h-11 self-start text-[15px] font-bold underline">
              ¿Tenés un código de descuento?
            </button>
          )}
          {precio?.conCupon && <Aviso tono="ok">Código aplicado: {pct} % de descuento.</Aviso>}
          {error && <Aviso tono="error">{error}</Aviso>}
          <Button size="lg" className="w-full" onClick={comprarCurso} disabled={comprando}>
            {comprando ? 'Un momento…' : precio?.monto === 0 ? 'Obtener el curso' : 'Comprar curso'}
          </Button>
          <p className="text-[13px] text-ink-muted">Pago seguro con Mercado Pago. Tenés 10 días para arrepentirte.</p>
        </>
      ) : (
        <>
          <ButtonLink to={volverAca(pathname)} size="lg" className="w-full">Ingresá para comprar</ButtonLink>
          <p className="text-[13px] text-ink-muted">
            ¿No tenés cuenta? <Link to={`/crear-cuenta?volver=${encodeURIComponent(pathname)}`} className="font-bold underline">Creala en un minuto</Link>.
          </p>
        </>
      )}
    </div>
  );
}

function CajaCertificado({ curso }) {
  const { usuario } = useSesion();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState('');

  async function obtener() {
    setEmitiendo(true);
    setError('');
    try {
      const c = await emitirCertificado(curso);
      navigate(`/certificados/${c.codigo}`);
    } catch (e) {
      setError(e.message);
      setEmitiendo(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-card border-2 border-menta bg-card p-6">
      <h2 className="font-body text-lg font-bold">¡Terminaste el curso!</h2>
      <p className="text-[15px]">Ya podés obtener tu certificado de finalización.</p>
      {usuario ? (
        <Button variante="menta" onClick={obtener} disabled={emitiendo}>{emitiendo ? 'Un momento…' : 'Obtener certificado'}</Button>
      ) : (
        <ButtonLink to={volverAca(pathname)} variante="menta">Ingresá para obtenerlo</ButtonLink>
      )}
      {error && (
        <Aviso tono="error" className="w-full">
          {error}{' '}
          {/nombre/i.test(error) && <Link to="/mi-cuenta" className="underline">Ir a Mi cuenta</Link>}
        </Aviso>
      )}
    </div>
  );
}

export default function Curso() {
  const { slug } = useParams();
  const { usuario } = useSesion();
  const { pathname } = useLocation();
  const [curso, setCurso] = useState(undefined);
  const [errorCarga, setErrorCarga] = useState('');
  const [actual, setActual] = useState(0);
  const [recarga, setRecarga] = useState(0);
  const [recienComprado, setRecienComprado] = useState(false);
  const { vistas, marcarVista, posiciones, recordarPosicion, enCuenta, error: errorProgreso } = useProgreso(curso || null);
  useTitulo(curso === null ? 'Página no encontrada' : curso?.titulo || 'Cursos');

  useEffect(() => {
    setActual(0);
    setRecienComprado(false);
  }, [slug]);

  // Se recarga al ingresar/salir (cambia si está comprado) y después de una compra sin cargo.
  useEffect(() => {
    let activo = true;
    setErrorCarga('');
    obtenerCurso(slug)
      .then((c) => activo && setCurso(c))
      .catch((e) => activo && setErrorCarga(e.message));
    return () => {
      activo = false;
    };
  }, [slug, usuario?.id, recarga]);

  const clase = curso?.clases[actual];
  const habilitada = Boolean(curso && clase && puedeVerClase(curso, clase));
  const { medio, error: errorMedio } = useMedio(clase, habilitada);

  // Minuto del video: se guarda cada 15 segundos de avance, al pausar y al cambiar de clase.
  // Cerca del final se guarda 0, así la próxima vez arranca de nuevo.
  const avance = useRef({ claseId: null, seg: 0, dur: 0, guardado: 0 });
  const guardarAvance = useCallback(() => {
    const a = avance.current;
    if (!a.claseId || Math.abs(a.seg - a.guardado) < 1) return;
    recordarPosicion(a.claseId, a.dur && a.dur - a.seg < 15 ? 0 : a.seg);
    a.guardado = a.seg;
  }, [recordarPosicion]);
  const claseId = clase?.id;
  useEffect(() => {
    avance.current = { claseId, seg: 0, dur: 0, guardado: 0 };
    return guardarAvance;
  }, [claseId, guardarAvance]);
  const eventosVideo = {
    onTiempo: (seg, dur) => {
      Object.assign(avance.current, { seg, dur });
      if (Math.abs(seg - avance.current.guardado) >= 15) guardarAvance();
    },
    onPausa: guardarAvance,
    onFin: () => {
      Object.assign(avance.current, { seg: 0, guardado: 0 });
      recordarPosicion(claseId, 0);
      if (!vistas.includes(claseId)) marcarVista(claseId);
    },
  };

  if (errorCarga) return <div className="container-page py-16"><Aviso tono="error">{errorCarga}</Aviso></div>;
  if (curso === undefined) return <p className="container-page py-16 text-ink-muted">Cargando curso…</p>;
  if (curso === null) return <NoEncontrada />;

  const gratis = curso.precio === 0;
  const acceso = gratis || curso.comprado;
  const vista = vistas.includes(clase.id);
  const cantidadVistas = curso.clases.filter((c) => vistas.includes(c.id)).length;
  const pct = Math.round((cantidadVistas / curso.clases.length) * 100);
  const terminado = cantidadVistas === curso.clases.length;
  // Material descargable: la clase es un PDF o trae un PDF de apoyo.
  const tienePdf = clase.tipo === 'pdf' || Boolean(clase.material);
  const urlMaterial = medio?.material || (clase.tipo === 'pdf' ? medio?.pdf : null);

  function completar() {
    marcarVista(clase.id);
    if (actual < curso.clases.length - 1) setActual(actual + 1);
  }

  return (
    <div className="container-page flex flex-col gap-6 py-8 sm:py-12 lg:pb-24">
      <nav aria-label="Ubicación" className="text-sm font-semibold text-ink-muted">
        <Link to="/cursos" className="text-menta-deep underline">Cursos</Link> / {curso.titulo}
      </nav>

      {recienComprado && <Aviso tono="ok">¡Listo! Ya tenés el curso completo.</Aviso>}

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
          <Reproductor clase={clase} habilitada={habilitada} medio={medio} error={errorMedio} inicio={posiciones[clase.id] || 0} on={eventosVideo} />
          {habilitada && clase.tipo === 'video' && medio?.video && posiciones[clase.id] > 5 && (
            <p className="-mt-2 text-sm text-ink-muted">Retomás desde el minuto {Math.floor(posiciones[clase.id] / 60)}:{String(Math.floor(posiciones[clase.id] % 60)).padStart(2, '0')}.</p>
          )}

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <Badge tono={gratis ? 'gratis' : 'pago'}>{gratis ? 'Gratis' : 'Pago'}</Badge>
              <Badge>{curso.formato}</Badge>
            </div>
            <p className="text-sm font-semibold text-ink-muted">
              Clase {actual + 1} de {curso.clases.length}
            </p>
            <h1 className="text-[clamp(28px,3.4vw,40px)] leading-[1.1]">{clase.titulo}</h1>
            <p className="max-w-[680px] text-[17px]">
              {clase.descripcion || '[Descripción breve de la clase: qué se ve y para qué edades sirve.]'}
            </p>
          </div>

          {habilitada && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={completar} disabled={vista && actual === curso.clases.length - 1}>
                {vista ? 'Clase completada' : 'Marcar como vista'}
              </Button>
              {tienePdf && (urlMaterial || USE_MOCKS) && (
                <a
                  href={urlMaterial || '#material'}
                  target={urlMaterial ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-ink px-[22px] font-bold"
                >
                  <Icono nombre="descargar" size={20} /> Descargar material (PDF)
                </a>
              )}
            </div>
          )}
          {errorProgreso && <Aviso tono="error">{errorProgreso}</Aviso>}
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          {!acceso && (
            <CajaCompra
              curso={curso}
              onComprado={() => {
                setRecienComprado(true);
                setRecarga((n) => n + 1);
              }}
            />
          )}

          {acceso && terminado && curso.otorgaCertificado && <CajaCertificado curso={curso} />}

          <div className="flex flex-col gap-4 rounded-card border border-borde bg-card p-6">
            {acceso && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between gap-3 font-bold">
                  <span>Tu progreso</span>
                  <span>
                    {cantidadVistas} de {curso.clases.length}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Progreso del curso"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="h-2.5 overflow-hidden rounded-full bg-lila-suave"
                >
                  <div className="h-full rounded-full bg-menta-deep transition-[width]" style={{ width: `${pct}%` }} />
                </div>
                {supabase && !enCuenta && (
                  <p className="text-[13px] text-ink-muted">
                    Se guarda en este navegador. <Link to={volverAca(pathname)} className="font-bold underline">Ingresá</Link> para
                    guardarlo en tu cuenta.
                  </p>
                )}
              </div>
            )}
            <ol className="flex flex-col gap-2">
              {curso.clases.map((c, i) => {
                const ok = vistas.includes(c.id);
                const bloqueada = !puedeVerClase(curso, c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActual(i)}
                      aria-current={i === actual ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 rounded-bloque border-2 p-3 text-left ${
                        i === actual ? 'border-lavanda bg-lila-suave' : 'border-transparent hover:bg-lila-suave/60'
                      } ${bloqueada ? 'opacity-70' : ''}`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-bold ${
                          ok ? 'bg-menta' : bloqueada ? 'bg-borde' : 'bg-amarillo'
                        }`}
                      >
                        {ok ? <Icono nombre="check" size={16} strokeWidth={3} /> : bloqueada ? <Icono nombre="candado" size={14} /> : i + 1}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[15px] font-bold">
                          {i + 1}. {c.titulo}
                        </span>
                        <span className="text-[13px] font-medium text-ink-muted">
                          {c.tipo === 'pdf' ? 'PDF descargable' : c.duracion ? `Video · ${c.duracion}` : 'Video'}
                          {c.muestra && !acceso ? ' · Clase de muestra' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex flex-col gap-2 rounded-card bg-menta p-6">
            <h2 className="font-body text-base font-bold">¿Te quedó una duda?</h2>
            <p className="text-[15px]">Si es sobre tu hijo en particular, lo mejor es verlo en consulta.</p>
            <ButtonLink to="/turnos" variante="amarillo" size="sm" className="self-start">Pedir turno</ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
