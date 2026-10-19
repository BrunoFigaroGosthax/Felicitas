import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import Button from '../../components/ui/Button.jsx';
import Casilla from '../../components/ui/Casilla.jsx';
import Field from '../../components/ui/Field.jsx';
import { BotonTexto, Estado, Panel, useAccion, useCarga } from '../../components/admin/ui.jsx';
import {
  borrarObraSocial,
  borrarTestimonio,
  guardarObraSocial,
  guardarTestimonio,
  listarObrasSocialesAdmin,
  listarTestimoniosAdmin,
} from '../../services/admin.js';
import { fechaLocal } from '../../services/turnos.js';

// ---------------- Testimonios ----------------

function Testimonio({ t, onCambio }) {
  const nuevo = !t;
  const inicial = { texto: '', autor: '', permiso_at: fechaLocal(), permiso_detalle: '', publicado: false, orden: '0' };
  const [d, setD] = useState(t ? { ...t, permiso_detalle: t.permiso_detalle || '', orden: String(t.orden) } : inicial);
  const [errores, setErrores] = useState({});
  const [guardado, setGuardado] = useState(false);
  const { ocupado, error, accion } = useAccion();
  const set = (campo) => (e) => {
    setGuardado(false);
    setD({ ...d, [campo]: e?.target ? e.target.value : e });
  };

  async function guardar(e) {
    e.preventDefault();
    const err = {};
    if (!d.texto.trim()) err.texto = 'Escribí el testimonio.';
    if (!d.autor.trim()) err.autor = 'Escribí cómo se firma.';
    if (!d.permiso_at) err.permiso_at = 'Indicá cuándo dio el permiso.';
    setErrores(err);
    if (Object.keys(err).length) return;
    if (await accion(() => guardarTestimonio(d, t?.id))) {
      if (nuevo) setD(inicial);
      else setGuardado(true);
      onCambio();
    }
  }

  return (
    <form onSubmit={guardar} noValidate className={`flex flex-col gap-4 rounded-bloque p-4 sm:p-5 ${nuevo ? 'border-2 border-dashed border-borde' : 'border border-borde'}`}>
      {nuevo && <p className="font-bold">Nuevo testimonio</p>}
      <Field label="Testimonio" as="textarea" rows={3} value={d.texto} onChange={set('texto')} error={errores.texto} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Field label="Firma" value={d.autor} onChange={set('autor')} error={errores.autor} placeholder="Ej.: Laura, mamá de Tomás" />
        <Field label="Fecha del permiso" type="date" value={d.permiso_at} onChange={set('permiso_at')} error={errores.permiso_at} />
        <Field label="Cómo se obtuvo el permiso" value={d.permiso_detalle} onChange={set('permiso_detalle')} placeholder="Ej.: por WhatsApp, captura guardada" />
        <Field label="Orden" type="number" value={d.orden} onChange={set('orden')} />
      </div>
      <Casilla checked={d.publicado} onChange={set('publicado')}>Publicado en la home</Casilla>
      {error && <Aviso tono="error">{error}</Aviso>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variante={nuevo ? 'menta' : 'secundario'} disabled={ocupado}>{nuevo ? 'Agregar' : 'Guardar'}</Button>
        {!nuevo && (
          <BotonTexto peligro disabled={ocupado} onClick={async () => window.confirm('¿Borrar este testimonio?') && (await accion(() => borrarTestimonio(t.id))) && onCambio()}>
            Borrar
          </BotonTexto>
        )}
        {guardado && <span className="text-sm font-semibold text-menta-deep">Guardado</span>}
      </div>
    </form>
  );
}

// ---------------- Obras sociales ----------------

function ObraSocial({ o, onCambio }) {
  const nuevo = !o;
  const [d, setD] = useState(o ? { ...o, orden: String(o.orden) } : { nombre: '', activa: true, orden: '0' });
  const [guardado, setGuardado] = useState(false);
  const { ocupado, error, accion } = useAccion();

  return (
    <li>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!d.nombre.trim()) return;
          if (await accion(() => guardarObraSocial(d, o?.id))) {
            if (nuevo) setD({ nombre: '', activa: true, orden: '0' });
            else setGuardado(true);
            onCambio();
          }
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field label={nuevo ? 'Nueva obra social' : 'Nombre'} value={d.nombre} onChange={(e) => { setGuardado(false); setD({ ...d, nombre: e.target.value }); }} className="min-w-0 flex-[3_1_220px]" />
        <Field label="Orden" type="number" value={d.orden} onChange={(e) => setD({ ...d, orden: e.target.value })} className="min-w-0 flex-[0_1_100px]" />
        <Casilla checked={d.activa} onChange={(v) => setD({ ...d, activa: v })} className="pb-0.5">Activa</Casilla>
        <Button type="submit" size="sm" variante={nuevo ? 'menta' : 'secundario'} disabled={ocupado}>{nuevo ? 'Agregar' : 'Guardar'}</Button>
        {!nuevo && (
          <BotonTexto peligro disabled={ocupado} onClick={async () => window.confirm(`¿Borrar ${o.nombre}?`) && (await accion(() => borrarObraSocial(o.id))) && onCambio()}>
            Borrar
          </BotonTexto>
        )}
        {guardado && <span className="pb-3 text-sm font-semibold text-menta-deep">Guardado</span>}
      </form>
      {error && <Aviso tono="error" className="mt-2">{error}</Aviso>}
    </li>
  );
}

export default function AdminContenido() {
  const testimonios = useCarga(listarTestimoniosAdmin);
  const obras = useCarga(listarObrasSocialesAdmin);

  return (
    <div className="flex flex-col gap-6">
      <Panel titulo="Testimonios">
        <p className="text-[15px] text-ink-muted">Publicá solo testimonios con permiso de la familia, y anotá cómo y cuándo lo dio.</p>
        <Estado cargando={testimonios.cargando} error={testimonios.error}>
          <div className="flex flex-col gap-4">
            {(testimonios.datos || []).map((t) => <Testimonio key={`${t.id}-${t.updated_at}`} t={t} onCambio={testimonios.recargar} />)}
            <Testimonio onCambio={testimonios.recargar} />
          </div>
        </Estado>
      </Panel>

      <Panel titulo="Obras sociales">
        <p className="text-[15px] text-ink-muted">Aparecen en la home y en el formulario de turnos. "Particular" se agrega solo.</p>
        <Estado cargando={obras.cargando} error={obras.error}>
          <ul className="flex flex-col gap-4">
            {(obras.datos || []).map((o) => <ObraSocial key={`${o.id}-${o.updated_at}`} o={o} onCambio={obras.recargar} />)}
            <ObraSocial onCambio={obras.recargar} />
          </ul>
        </Estado>
      </Panel>
    </div>
  );
}
