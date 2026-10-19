import { useState } from 'react';
import Field from '../../components/ui/Field.jsx';
import { Estado, Etiqueta, Panel, Tabla, fecha, useCarga } from '../../components/admin/ui.jsx';
import { MOTIVOS } from '../../data/contenido.js';
import { listarTurnos } from '../../services/admin.js';
import { fechaLocal } from '../../services/turnos.js';

const motivo = (id) => MOTIVOS.find((m) => m.id === id)?.label || id;

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
    <Panel titulo="Turnos pedidos por la web">
      <p className="text-[15px] text-ink-muted">
        Solo los que se pidieron desde este sitio, sin datos del paciente. La agenda completa, con los datos del paciente, está en DrApp.
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
            { titulo: 'Estado', render: (t) => <Etiqueta tono={t.estado === 'cancelado' ? 'mal' : 'ok'}>{t.estado === 'cancelado' ? 'Cancelado' : 'Reservado'}</Etiqueta> },
          ]}
        />
      </Estado>
    </Panel>
  );
}
