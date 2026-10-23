import { useState } from 'react';
import Field from '../../components/ui/Field.jsx';
import { Estado, Etiqueta, Panel, Tabla, fechaHora, useCarga } from '../../components/admin/ui.jsx';
import { listarCompras, listarUsuarios } from '../../services/admin.js';
import { pesos } from '../../services/formato.js';

const ESTADOS = {
  aprobada: ['Aprobada', 'ok'],
  pendiente: ['Pendiente', 'pendiente'],
  rechazada: ['Rechazada', 'mal'],
  cancelada: ['Cancelada', 'neutro'],
  reembolsada: ['Reembolsada', 'info'],
};

async function cargar() {
  const [compras, usuarios] = await Promise.all([listarCompras(), listarUsuarios()]);
  const emails = new Map(usuarios.map((u) => [u.id, u.email]));
  return compras.map((c) => ({ ...c, email: c.usuario_id ? emails.get(c.usuario_id) || '—' : 'Cuenta borrada' }));
}

function Dato({ titulo, valor }) {
  return (
    <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1 rounded-bloque bg-lila-suave p-4">
      <p className="text-sm font-semibold text-ink-muted">{titulo}</p>
      <p className="font-display text-[28px] font-semibold leading-tight">{valor}</p>
    </div>
  );
}

export default function AdminVentas() {
  const { datos, error, cargando } = useCarga(cargar);
  const [filtro, setFiltro] = useState('aprobada');
  const compras = datos || [];
  const aprobadas = compras.filter((c) => c.estado === 'aprobada' && c.proveedor !== 'demo');
  const demos = compras.filter((c) => c.proveedor === 'demo').length;
  const visibles = filtro === 'todas' ? compras : compras.filter((c) => c.estado === filtro);

  return (
    <Panel titulo="Ventas">
      <Estado cargando={cargando} error={error}>
        <div className="flex flex-wrap gap-3">
          <Dato titulo="Recaudado" valor={pesos(aprobadas.reduce((s, c) => s + Number(c.monto), 0))} />
          <Dato titulo="Ventas aprobadas" valor={aprobadas.length} />
          <Dato titulo="Pagos pendientes" valor={compras.filter((c) => c.estado === 'pendiente' && c.proveedor !== 'demo').length} />
        </div>
        {demos > 0 && (
          <p className="text-sm text-ink-muted">
            Hay {demos} {demos === 1 ? 'compra' : 'compras'} de demostración (marcadas "Demo"): no cuentan en los totales.
          </p>
        )}
        <Field label="Mostrar" as="select" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-[260px]">
          <option value="aprobada">Aprobadas</option>
          <option value="pendiente">Pendientes</option>
          <option value="reembolsada">Reembolsadas</option>
          <option value="rechazada">Rechazadas</option>
          <option value="todas">Todas</option>
        </Field>
        <Tabla
          filas={visibles}
          clave={(c) => c.id}
          vacio="No hay ventas con ese estado."
          columnas={[
            { titulo: 'Fecha', render: (c) => fechaHora(c.aprobada_at || c.created_at) },
            { titulo: 'Alumno', render: (c) => <span className="break-all">{c.email}</span> },
            { titulo: 'Curso', render: (c) => c.cursos?.titulo || '—' },
            {
              titulo: 'Monto',
              render: (c) => (
                <span className="flex flex-col">
                  <strong>{Number(c.monto) === 0 ? 'Sin cargo' : pesos(Number(c.monto))}</strong>
                  {Number(c.descuento) > 0 && <s className="text-sm text-ink-muted">{pesos(Number(c.precio_lista))}</s>}
                </span>
              ),
            },
            { titulo: 'Cupón', render: (c) => c.cupones?.codigo || '—' },
            { titulo: 'Estado', render: (c) => <Etiqueta tono={ESTADOS[c.estado]?.[1]}>{ESTADOS[c.estado]?.[0] || c.estado}</Etiqueta> },
            {
              titulo: 'Pago',
              render: (c) =>
                c.proveedor === 'demo' ? (
                  <Etiqueta tono="info">Demo</Etiqueta>
                ) : (
                  <span className="text-sm text-ink-muted">{c.proveedor === 'sin_cargo' ? 'Sin cargo' : c.pago_id ? `MP ${c.pago_id}` : '—'}</span>
                ),
            },
          ]}
        />
        <p className="text-sm text-ink-muted">
          Los reembolsos se hacen desde Mercado Pago: el acceso al curso se quita solo cuando llega el aviso.
        </p>
      </Estado>
    </Panel>
  );
}
