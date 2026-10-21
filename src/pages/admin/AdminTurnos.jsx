import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import { Estado, Etiqueta, Panel, Tabla, fecha, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { MOTIVOS } from '../../data/contenido.js';
import { listarBloqueos, listarTurnos, sincronizarAgenda } from '../../services/admin.js';
import { fechaLocal } from '../../services/turnos.js';

const motivo = (id) => MOTIVOS.find((m) => m.id === id)?.label || id;
const NOMBRES = { drapp: 'DrApp', otro: 'Otro sistema' };
const sistema = (id) => NOMBRES[id] || id;

function Sincronizacion() {
  const hoy = fechaLocal();
  const { datos, error, cargando, recargar } = useCarga(() => listarBloqueos(hoy));
  const { ocupado, error: errorAccion, accion } = useAccion();
  const [resultado, setResultado] = useState(null);
  const bloqueos = datos || [];
  const problemas = bloqueos.filter((b) => !b.bloqueo_id || b.error);

  return (
    <Panel
      titulo="Sincronización entre sistemas"
      acciones={
        <Button
          size="sm"
          variante="secundario"
          disabled={ocupado}
          onClick={async () => {
            setResultado(null);
            if (await accion(async () => setResultado(await sincronizarAgenda()))) recargar();
          }}
        >
          {ocupado ? 'Sincronizando…' : 'Sincronizar ahora'}
        </Button>
      }
    >
      <p className="text-[15px] text-ink-muted">
        Cada turno se guarda en un solo sistema. En los demás se marca ese horario como "ocupado", sin datos del paciente, para que nadie lo
        vuelva a dar. Esto se revisa solo; con este botón se fuerza la revisión.
      </p>
      {errorAccion && <Aviso tono="error">{errorAccion}</Aviso>}
      {resultado && (
        <Aviso tono={resultado.errores?.length || resultado.pendientes ? 'error' : 'ok'}>
          Revisión hecha: {resultado.creados} ocupados nuevos, {resultado.liberados} liberados, {resultado.pendientes} pendientes.
          {resultado.errores?.map((e) => <span key={e} className="block">{e}</span>)}
        </Aviso>
      )}
      <Estado cargando={cargando} error={error}>
        {problemas.length ? (
          <>
            <Aviso tono="error">
              {problemas.length === 1 ? 'Hay 1 horario' : `Hay ${problemas.length} horarios`} que todavía no se pudo marcar como ocupado. Se reintenta solo; si
              sigue, revisalo a mano en el sistema indicado.
            </Aviso>
            <Tabla
              filas={problemas}
              clave={(b) => b.id}
              columnas={[
                { titulo: 'Día', render: (b) => fecha(b.fecha) },
                { titulo: 'Hora', render: (b) => b.hora.slice(0, 5) },
                { titulo: 'Turno en', render: (b) => sistema(b.origen_sistema) },
                { titulo: 'Falta marcar en', render: (b) => sistema(b.destino_sistema) },
                { titulo: 'Detalle', render: (b) => <span className="text-sm text-ink-muted">{b.error || 'Pendiente'}</span> },
              ]}
            />
          </>
        ) : (
          <p className="text-[15px]">
            <Etiqueta tono="ok">Al día</Etiqueta>{' '}
            {bloqueos.length ? `${bloqueos.length} horarios marcados como ocupados en otros sistemas.` : 'Por ahora hay un solo sistema conectado: no hace falta sincronizar.'}
          </p>
        )}
      </Estado>
    </Panel>
  );
}

export default function AdminTurnos() {
  const { datos, error, cargando } = useCarga(listarTurnos);
  const [filtro, setFiltro] = useState('proximos');
  const hoy = fechaLocal();
  const turnos = datos || [];
  const visibles =
    filtro === 'proximos'
      ? turnos.filter((t) => t.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
      : filtro === 'pasados'
        ? turnos.filter((t) => t.fecha < hoy)
        : turnos;

  return (
    <div className="flex flex-col gap-6">
      <Panel titulo="Turnos pedidos por la web">
        <p className="text-[15px] text-ink-muted">
          Solo los que se pidieron desde este sitio, sin datos del paciente. La agenda completa, con los datos del paciente, está en cada sistema de turnos.
        </p>
        <Field label="Mostrar" as="select" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-[260px]">
          <option value="proximos">Próximos</option>
          <option value="pasados">Pasados</option>
          <option value="todos">Todos</option>
        </Field>
        <Estado cargando={cargando} error={error}>
          <Tabla
            filas={visibles}
            clave={(t) => t.id}
            vacio="No hay turnos para mostrar."
            columnas={[
              { titulo: 'Día', render: (t) => <strong>{fecha(t.fecha)}</strong> },
              { titulo: 'Hora', render: (t) => t.hora.slice(0, 5) },
              { titulo: 'Motivo', render: (t) => motivo(t.motivo) },
              { titulo: 'Responsable', render: (t) => t.responsable_nombre },
              {
                titulo: 'Contacto',
                render: (t) => (
                  <span className="flex flex-col">
                    <a href={`tel:${t.telefono.replace(/[^\d+]/g, '')}`} className="underline">{t.telefono}</a>
                    <a href={`mailto:${t.email}`} className="break-all text-sm underline">{t.email}</a>
                  </span>
                ),
              },
              { titulo: 'Sistema', render: (t) => sistema(t.sistema) },
              {
                titulo: 'Estado',
                render: (t) => (
                  <span className="flex flex-col gap-1">
                    <Etiqueta tono={t.estado === 'cancelado' ? 'mal' : 'ok'}>{t.estado === 'cancelado' ? 'Cancelado' : 'Reservado'}</Etiqueta>
                    {t.recordatorio_enviado_at && <span className="text-[13px] text-ink-muted">Recordatorio enviado</span>}
                  </span>
                ),
              },
            ]}
          />
        </Estado>
      </Panel>
      <Sincronizacion />
    </div>
  );
}
