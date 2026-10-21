import { useEffect, useMemo, useRef, useState } from 'react';
import Button, { ButtonLink } from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import GrupoOpciones from '../components/ui/GrupoOpciones.jsx';
import OpcionChip from '../components/ui/OpcionChip.jsx';
import Icono from '../components/ui/Icono.jsx';
import Casilla from '../components/ui/Casilla.jsx';
import useTitulo from '../hooks/useTitulo.js';
import { CONTACTO, MOTIVOS } from '../data/contenido.js';
import { TERMINOS_VERSION } from '../data/legal.js';
import { listarObrasSociales } from '../services/contenido.js';
import { Link } from 'react-router-dom';
import { fechaLocal, obtenerDisponibilidad, proximosDiasHabiles, reservarTurno } from '../services/turnos.js';

const PASOS = ['Paciente', 'Motivo', 'Día y horario', 'Confirmación'];

const vacio = {
  paciente: '',
  nacimiento: '',
  responsable: '',
  telefono: '',
  email: '',
  obraSocial: '',
  motivo: '',
  detalle: '',
  fecha: '',
  hora: '',
  acepta: false,
};

const fmtDia = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
const fmtLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const aFecha = (iso) => new Date(`${iso}T12:00:00`);
const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function validar(paso, d) {
  const e = {};
  if (paso === 1) {
    if (!d.paciente.trim()) e.paciente = 'Escribí el nombre y apellido del paciente.';
    if (!d.nacimiento) e.nacimiento = 'Elegí la fecha de nacimiento.';
    else if (d.nacimiento > fechaLocal()) e.nacimiento = 'La fecha de nacimiento no puede ser posterior a hoy.';
    if (!d.responsable.trim()) e.responsable = 'Escribí el nombre del adulto responsable.';
    if (!/^[\d\s()+-]{8,}$/.test(d.telefono)) e.telefono = 'Ingresá un teléfono con código de área.';
    if (!/^\S+@\S+\.\S+$/.test(d.email)) e.email = 'Ingresá un email válido.';
    if (!d.obraSocial) e.obraSocial = 'Elegí una opción.';
    if (!d.acepta) e.acepta = 'Para pedir el turno tenés que aceptar la política de privacidad.';
  }
  if (paso === 2 && !d.motivo) e.motivo = 'Elegí un motivo de consulta.';
  if (paso === 3) {
    if (!d.fecha) e.fecha = 'Elegí un día.';
    if (!d.hora) e.hora = 'Elegí un horario.';
  }
  return e;
}

export default function Turnos() {
  useTitulo('Pedí tu turno');
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [reintento, setReintento] = useState(0);
  const [obrasSociales, setObrasSociales] = useState([]);

  useEffect(() => {
    listarObrasSociales().then(setObrasSociales);
  }, []);

  const dias = useMemo(() => proximosDiasHabiles(5), []);
  const hoy = useMemo(() => fechaLocal(), []);
  const pasosRef = useRef(null);
  const tituloRef = useRef(null);
  const primerRender = useRef(true);

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target ? e.target.value : e }));

  // Al cambiar de paso: subir hasta los pasos y llevar el foco al título (en celular quedaba abajo).
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    pasosRef.current?.scrollIntoView({ block: 'start' });
    tituloRef.current?.focus({ preventScroll: true });
  }, [paso]);

  // Al elegir un día, traer sus horarios.
  useEffect(() => {
    if (!datos.fecha) return;
    let activo = true;
    setCargando(true);
    setErrorHorarios(false);
    obtenerDisponibilidad(datos.fecha)
      .then((h) => activo && setHorarios(h))
      .catch(() => {
        if (!activo) return;
        setHorarios([]);
        setErrorHorarios(true);
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [datos.fecha, reintento]);

  const motivo = MOTIVOS.find((m) => m.id === datos.motivo);
  const diaLargo = datos.fecha ? capitalizar(fmtLargo.format(aFecha(datos.fecha))) : 'Sin elegir';

  async function siguiente() {
    const e = validar(paso, datos);
    setErrores(e);
    if (Object.keys(e).length) return;
    if (paso === 3) {
      setEnviando(true);
      setErrorEnvio('');
      try {
        const { acepta: _acepta, ...turno } = datos;
        await reservarTurno({ ...turno, consentimiento: TERMINOS_VERSION });
        setPaso(4);
      } catch (err) {
        setErrorEnvio(err.message);
        if (err.status === 409) {
          // Alguien tomó el horario recién (por la web o en otro sistema): se actualizan los horarios.
          setDatos((d) => ({ ...d, hora: '' }));
          setReintento((n) => n + 1);
        }
      } finally {
        setEnviando(false);
      }
      return;
    }
    setPaso(paso + 1);
  }

  return (
    <div className="container-page flex flex-col gap-7 py-10 sm:py-14 lg:pb-24">
      <div className="flex max-w-2xl flex-col gap-2.5">
        <h1 className="text-[clamp(34px,4.4vw,52px)] leading-[1.05]">Pedí tu turno</h1>
        <p className="text-[17px] text-ink-muted">
          Son cuatro pasos. Los horarios que ves están actualizados con la agenda del consultorio.
        </p>
      </div>

      <ol ref={pasosRef} aria-label="Pasos" className="grid scroll-mt-28 grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PASOS.map((label, i) => {
          const n = i + 1;
          const activo = n === paso;
          const hecho = n < paso;
          return (
            <li
              key={label}
              aria-current={activo ? 'step' : undefined}
              className={`flex items-center gap-2.5 rounded-full px-3.5 py-2.5 text-[15px] font-bold ${
                activo ? 'bg-lavanda' : hecho ? 'border border-borde bg-card' : 'border border-dashed border-borde text-ink-muted'
              }`}
            >
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm ${
                  activo ? 'bg-page' : hecho ? 'bg-menta' : 'bg-lila-suave'
                }`}
              >
                {hecho ? <Icono nombre="check" size={16} strokeWidth={3} /> : n}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-start gap-7">
        <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 rounded-card border border-borde bg-card p-5 sm:p-10">
          {paso === 1 && (
            <>
              <h2 ref={tituloRef} tabIndex={-1} className="text-[28px] outline-none">Datos del paciente</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
                <Field label="Nombre y apellido del niño o niña" placeholder="Ej.: Sofía Pérez" value={datos.paciente} onChange={set('paciente')} error={errores.paciente} autoComplete="off" />
                <Field label="Fecha de nacimiento" type="date" max={hoy} value={datos.nacimiento} onChange={set('nacimiento')} error={errores.nacimiento} />
                <Field label="Adulto responsable" placeholder="Tu nombre y apellido" value={datos.responsable} onChange={set('responsable')} error={errores.responsable} autoComplete="name" />
                <Field label="WhatsApp" type="tel" placeholder="11 2345 6789" value={datos.telefono} onChange={set('telefono')} error={errores.telefono} ayuda="Por si necesitamos avisarte algo del turno." autoComplete="tel" />
                <Field label="Email" type="email" placeholder="nombre@correo.com" value={datos.email} onChange={set('email')} error={errores.email} autoComplete="email" />
                <Field label="Obra social" as="select" value={datos.obraSocial} onChange={set('obraSocial')} error={errores.obraSocial}>
                  <option value="">Elegí una opción</option>
                  {obrasSociales.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                  <option>Particular</option>
                </Field>
              </div>
              <Casilla checked={datos.acepta} onChange={set('acepta')} error={errores.acepta}>
                Acepto que mis datos y los del paciente se usen para gestionar el turno, según la{' '}
                <Link to="/privacidad" target="_blank" className="font-bold underline">política de privacidad</Link>.
              </Casilla>
            </>
          )}

          {paso === 2 && (
            <>
              <h2 ref={tituloRef} tabIndex={-1} className="text-[28px] outline-none">¿Cuál es el motivo de la consulta?</h2>
              <GrupoOpciones aria-label="Motivo" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                {MOTIVOS.map((m) => (
                  <OpcionChip
                    key={m.id}
                    seleccionado={datos.motivo === m.id}
                    onSelect={() => setDatos((d) => ({ ...d, motivo: m.id }))}
                    className="flex min-h-[76px] flex-col items-start gap-1 rounded-[20px] px-[18px] py-4 text-left"
                  >
                    <span className="font-bold">{m.label}</span>
                    <span className="text-sm font-medium text-ink-muted">{m.ayuda}</span>
                  </OpcionChip>
                ))}
              </GrupoOpciones>
              {errores.motivo && <p className="text-sm font-medium text-danger">{errores.motivo}</p>}
              <Field
                label="Contame brevemente (opcional)"
                as="textarea"
                rows={4}
                placeholder="Por ejemplo: tiene tos hace tres días y le cuesta dormir."
                value={datos.detalle}
                onChange={set('detalle')}
              />
            </>
          )}

          {paso === 3 && (
            <>
              <h2 ref={tituloRef} tabIndex={-1} className="text-[28px] outline-none">Elegí día y horario</h2>
              <GrupoOpciones aria-label="Día" className="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1">
                {dias.map((iso) => {
                  const f = aFecha(iso);
                  return (
                    <OpcionChip
                      key={iso}
                      seleccionado={datos.fecha === iso}
                      onSelect={() => setDatos((d) => ({ ...d, fecha: iso, hora: '' }))}
                      aria-label={capitalizar(fmtLargo.format(f))}
                      className="flex h-[84px] w-[76px] flex-none flex-col items-center justify-center gap-0.5 rounded-[20px]"
                    >
                      <span className="text-[13px] font-semibold capitalize">{fmtDia.format(f).replace('.', '')}</span>
                      <span className="font-display text-[26px] font-semibold leading-tight">{f.getDate()}</span>
                    </OpcionChip>
                  );
                })}
              </GrupoOpciones>
              {errores.fecha && <p className="text-sm font-medium text-danger">{errores.fecha}</p>}

              {datos.fecha && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold">Horarios disponibles · {diaLargo}</p>
                  {cargando ? (
                    <p className="text-ink-muted">Buscando horarios…</p>
                  ) : errorHorarios ? (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-bloque bg-danger/10 p-4">
                      <p className="font-medium text-danger">
                        No pudimos cargar los horarios. Probá de nuevo o escribinos por{' '}
                        <a href={CONTACTO.whatsappUrl} className="underline">WhatsApp</a>.
                      </p>
                      <Button variante="secundario" size="sm" onClick={() => setReintento((n) => n + 1)}>
                        Reintentar
                      </Button>
                    </div>
                  ) : horarios.some((h) => h.disponible) ? (
                    <GrupoOpciones aria-label="Horario" className="flex flex-wrap gap-3">
                      {horarios.map((h) => (
                        <OpcionChip
                          key={h.hora}
                          seleccionado={datos.hora === h.hora}
                          deshabilitado={!h.disponible}
                          onSelect={() => setDatos((d) => ({ ...d, hora: h.hora }))}
                          className="h-11 min-w-[88px] rounded-full px-4 text-[15px] font-semibold"
                        >
                          {h.hora}
                        </OpcionChip>
                      ))}
                    </GrupoOpciones>
                  ) : (
                    <p className="text-ink-muted">No quedan horarios este día. Probá con el siguiente.</p>
                  )}
                  {errores.hora && <p className="text-sm font-medium text-danger">{errores.hora}</p>}
                </div>
              )}
              {errorEnvio && (
                <p role="alert" className="rounded-bloque bg-danger/10 p-4 font-medium text-danger">{errorEnvio}</p>
              )}
            </>
          )}

          {paso === 4 && (
            <div className="flex flex-col items-start gap-4 py-3" role="status">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-menta">
                <Icono nombre="check" size={32} strokeWidth={2.5} />
              </span>
              <h2 ref={tituloRef} tabIndex={-1} className="text-[32px] leading-tight outline-none">¡Listo! Tu turno quedó reservado</h2>
              <p className="text-[17px]">
                {diaLargo} a las {datos.hora}. Te mandamos la confirmación por email a {datos.email}, con la dirección del consultorio. El día
                anterior te llega un recordatorio.
              </p>
              <p className="text-[15px] text-ink-muted">
                Si no podés venir, cancelalo con 24 horas de anticipación desde el link del email: así el horario queda libre para otra familia.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <ButtonLink to="/">Volver al inicio</ButtonLink>
                <ButtonLink to="/cursos" variante="secundario">Ver cursos gratuitos</ButtonLink>
              </div>
            </div>
          )}

          {paso < 4 && (
            <div className="flex flex-wrap-reverse justify-between gap-3 border-t border-borde pt-6">
              <Button
                variante="secundario"
                onClick={() => {
                  setErrorEnvio('');
                  setPaso(paso - 1);
                }}
                disabled={paso === 1}
              >
                Volver
              </Button>
              <Button onClick={siguiente} disabled={enviando}>
                {paso === 3 ? (enviando ? 'Reservando…' : 'Confirmar turno') : 'Continuar'}
              </Button>
            </div>
          )}
        </section>

        <aside aria-label="Resumen del turno" className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 rounded-card bg-amarillo p-7">
          <h2 className="text-2xl">Tu turno</h2>
          <dl className="flex flex-col gap-3">
            {[
              ['Profesional', CONTACTO.nombre],
              ['Motivo', motivo ? motivo.label : 'Sin elegir'],
              ['Día', diaLargo],
              ['Horario', datos.hora || 'Sin elegir'],
              ['Lugar', CONTACTO.direccion],
            ].map(([dt, dd]) => (
              <div key={dt}>
                <dt className="text-[13px] font-semibold text-ink-muted">{dt}</dt>
                <dd className="mt-0.5 font-bold">{dd}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-ink/20 pt-3 text-sm">
            ¿Es una urgencia? No esperes al turno: acudí a la guardia más cercana.
          </p>
        </aside>
      </div>
    </div>
  );
}
