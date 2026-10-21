import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Aviso from '../components/ui/Aviso.jsx';
import Button, { ButtonLink } from '../components/ui/Button.jsx';
import Icono from '../components/ui/Icono.jsx';
import { CONTACTO, MOTIVOS } from '../data/contenido.js';
import useTitulo from '../hooks/useTitulo.js';
import { cancelarTurno, turnoParaCancelar } from '../services/turnos.js';

const fmtLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const diaLargo = (iso) => {
  const s = fmtLargo.format(new Date(`${iso}T12:00:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** /turnos/cancelar?t=… : el paciente cancela desde el link del email, sin cuenta. */
export default function CancelarTurno() {
  useTitulo('Cancelar turno');
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [turno, setTurno] = useState(null);
  const [error, setError] = useState(token ? '' : 'El link está incompleto. Abrilo de nuevo desde el email.');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let activo = true;
    turnoParaCancelar(token)
      .then((t) => activo && setTurno(t))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [token]);

  async function cancelar() {
    setCancelando(true);
    setError('');
    try {
      setTurno(await cancelarTurno(token));
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelando(false);
    }
  }

  const motivo = MOTIVOS.find((m) => m.id === turno?.motivo)?.label;
  const cancelado = turno?.estado === 'cancelado';

  return (
    <div className="container-page flex justify-center py-12 sm:py-20 lg:pb-28">
      <div className="flex w-full max-w-[560px] flex-col items-start gap-5 rounded-card border border-borde bg-card p-6 sm:p-10">
        <h1 className="text-[clamp(30px,4vw,40px)] leading-tight">{cancelado ? 'Turno cancelado' : 'Cancelar turno'}</h1>

        {!turno && !error && <p className="text-ink-muted">Buscando tu turno…</p>}

        {turno && (
          <dl className="flex w-full flex-col gap-3 rounded-bloque bg-amarillo p-5">
            <div>
              <dt className="text-[13px] font-semibold text-ink-muted">Día y hora</dt>
              <dd className="mt-0.5 font-bold">
                {diaLargo(turno.fecha)} a las {turno.hora}
              </dd>
            </div>
            {motivo && (
              <div>
                <dt className="text-[13px] font-semibold text-ink-muted">Motivo</dt>
                <dd className="mt-0.5 font-bold">{motivo}</dd>
              </div>
            )}
          </dl>
        )}

        {turno && cancelado && (
          <div className="flex flex-col items-start gap-4" role="status">
            <p className="flex items-center gap-3 text-[17px]">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-menta">
                <Icono nombre="check" size={20} strokeWidth={2.5} />
              </span>
              Listo, liberamos el horario para otra familia. Te mandamos la confirmación por email.
            </p>
            <ButtonLink to="/turnos">Pedir otro turno</ButtonLink>
          </div>
        )}

        {turno && !cancelado && turno.pasado && <Aviso>Este turno ya pasó.</Aviso>}

        {turno && !cancelado && !turno.pasado && (
          <>
            <p className="text-[17px]">¿Seguro que querés cancelarlo? El horario queda libre para otra familia.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={cancelar} disabled={cancelando}>{cancelando ? 'Cancelando…' : 'Sí, cancelar turno'}</Button>
              <ButtonLink to="/" variante="secundario">No, mantenerlo</ButtonLink>
            </div>
          </>
        )}

        {error && (
          <Aviso tono="error" className="w-full">
            {error}{' '}
            <a href={CONTACTO.whatsappUrl} className="underline">Escribinos por WhatsApp</a>.
          </Aviso>
        )}
      </div>
    </div>
  );
}
