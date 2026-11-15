import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import Aviso from '../../components/ui/Aviso.jsx';
import { Etiqueta, fechaHora, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { MENSAJE_MANTENIMIENTO } from '../../data/contenido.js';
import { guardarAjustes, leerAjustes } from '../../services/admin.js';

/** Interruptor del modo mantenimiento, arriba de todas las secciones del panel. */
export default function EstadoSitio() {
  const { datos, error: errorCarga } = useCarga(leerAjustes);
  const [ajustes, setAjustes] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const { ocupado, error, accion } = useAccion();

  const actual = ajustes || datos;
  if (errorCarga) return <Aviso tono="error">{errorCarga}</Aviso>;
  if (!actual) return null;

  const cambiar = (nuevos) =>
    accion(async () => {
      setAjustes(await guardarAjustes(nuevos));
      setCerrando(false);
    });

  if (actual.mantenimiento) {
    return (
      <section aria-label="Estado del sitio" className="flex flex-col gap-3 rounded-card bg-amarillo p-5 text-on-brand sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Etiqueta tono="info">En mantenimiento</Etiqueta>
            <p className="font-bold">El público ve el aviso. No se pueden reservar turnos ni comprar cursos.</p>
          </div>
          <Button disabled={ocupado} onClick={() => cambiar({ mantenimiento: false, mensaje: actual.mensaje })}>
            {ocupado ? 'Abriendo…' : 'Abrir el sitio'}
          </Button>
        </div>
        <p className="text-[15px]">
          Mensaje: «{actual.mensaje || MENSAJE_MANTENIMIENTO}» · desde {fechaHora(actual.actualizado_at)}
        </p>
        {error && <Aviso tono="error">{error}</Aviso>}
      </section>
    );
  }

  return (
    <section aria-label="Estado del sitio" className="flex flex-col gap-4 rounded-card border border-borde bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Etiqueta tono="ok">Abierto</Etiqueta>
          <p className="font-bold">El sitio está abierto al público.</p>
        </div>
        {!cerrando && (
          <Button
            variante="secundario"
            size="sm"
            onClick={() => {
              setMensaje(actual.mensaje || '');
              setCerrando(true);
            }}
          >
            Poner en mantenimiento
          </Button>
        )}
      </div>
      {cerrando && (
        <form
          className="flex flex-col gap-4 border-t border-borde pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            cambiar({ mantenimiento: true, mensaje });
          }}
        >
          <p className="text-[15px] text-ink-muted">
            Mientras dure, el público ve una pantalla de aviso y no puede reservar turnos ni comprar cursos. Vos vas a seguir viendo el sitio completo
            para revisar los cambios.
          </p>
          <Field
            as="textarea"
            label="Mensaje para el público (opcional)"
            placeholder={MENSAJE_MANTENIMIENTO}
            ayuda="Si lo dejás vacío, se muestra el texto de ejemplo."
            value={mensaje}
            maxLength={300}
            onChange={(e) => setMensaje(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={ocupado}>
              {ocupado ? 'Guardando…' : 'Poner en mantenimiento'}
            </Button>
            <Button variante="secundario" disabled={ocupado} onClick={() => setCerrando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {error && <Aviso tono="error">{error}</Aviso>}
    </section>
  );
}
