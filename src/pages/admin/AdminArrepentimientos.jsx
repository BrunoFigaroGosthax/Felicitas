import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import { Estado, Etiqueta, Panel, fechaHora, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { atenderArrepentimiento, listarArrepentimientos } from '../../services/admin.js';

const HORAS_PLAZO = 24;

function Solicitud({ s, onCambio }) {
  const [respuesta, setRespuesta] = useState('');
  const { ocupado, error, accion } = useAccion();
  const horas = (Date.now() - new Date(s.created_at)) / 36e5;
  const pendiente = !s.atendido_at;

  return (
    <li className="flex flex-col gap-3 rounded-bloque border border-borde p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="font-display text-xl">{s.codigo}</strong>
        {pendiente ? (
          <Etiqueta tono={horas > HORAS_PLAZO ? 'mal' : 'pendiente'}>{horas > HORAS_PLAZO ? 'Vencido el plazo de 24 h' : 'Pendiente'}</Etiqueta>
        ) : (
          <Etiqueta tono="ok">Atendida</Etiqueta>
        )}
        <span className="text-sm text-ink-muted">{fechaHora(s.created_at)}</span>
      </div>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 text-[15px]">
        <div><dt className="text-sm text-ink-muted">Nombre</dt><dd className="font-semibold">{s.nombre}</dd></div>
        <div><dt className="text-sm text-ink-muted">Email</dt><dd><a href={`mailto:${s.email}?subject=Solicitud ${s.codigo}`} className="break-all underline">{s.email}</a></dd></div>
        <div><dt className="text-sm text-ink-muted">Teléfono</dt><dd>{s.telefono || '—'}</dd></div>
        <div><dt className="text-sm text-ink-muted">Compra</dt><dd>{s.compra_referencia || '—'}</dd></div>
      </dl>
      {s.detalle && <p className="rounded-bloque bg-lila-suave p-3 text-[15px]">{s.detalle}</p>}
      {pendiente ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await accion(() => atenderArrepentimiento(s.id, respuesta))) onCambio();
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Qué se hizo (queda registrado)" as="textarea" rows={2} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Ej.: reembolso hecho en Mercado Pago el 18/10, acceso quitado." />
          {error && <Aviso tono="error">{error}</Aviso>}
          <div>
            <Button type="submit" size="sm" variante="menta" disabled={ocupado}>Marcar como atendida</Button>
          </div>
        </form>
      ) : (
        <p className="text-[15px]"><span className="text-ink-muted">Atendida el {fechaHora(s.atendido_at)}:</span> {s.respuesta || '—'}</p>
      )}
    </li>
  );
}

export default function AdminArrepentimientos() {
  const { datos, error, cargando, recargar } = useCarga(listarArrepentimientos);
  const pendientes = (datos || []).filter((s) => !s.atendido_at);
  const atendidas = (datos || []).filter((s) => s.atendido_at);

  return (
    <Panel titulo="Botón de arrepentimiento">
      <p className="text-[15px] text-ink-muted">
        La ley pide responder dentro de las 24 horas. Para devolver el dinero: reembolsar el pago en Mercado Pago (el acceso al curso se quita solo) y
        después marcar la solicitud como atendida.
      </p>
      <Estado cargando={cargando} error={error}>
        {pendientes.length ? (
          <ul className="flex flex-col gap-4">
            {pendientes.map((s) => <Solicitud key={s.id} s={s} onCambio={recargar} />)}
          </ul>
        ) : (
          <Aviso tono="ok">No hay solicitudes pendientes.</Aviso>
        )}
        {atendidas.length > 0 && (
          <details className="flex flex-col gap-4">
            <summary className="min-h-11 cursor-pointer py-2 font-bold">Atendidas ({atendidas.length})</summary>
            <ul className="mt-3 flex flex-col gap-4">
              {atendidas.map((s) => <Solicitud key={s.id} s={s} onCambio={recargar} />)}
            </ul>
          </details>
        )}
      </Estado>
    </Panel>
  );
}
