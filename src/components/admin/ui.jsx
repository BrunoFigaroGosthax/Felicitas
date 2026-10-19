// Piezas compartidas del panel de administración.
import { useCallback, useEffect, useState } from 'react';
import Aviso from '../ui/Aviso.jsx';

/** Carga datos con estado: { datos, error, cargando, recargar }. `clave` cambia → vuelve a cargar. */
export function useCarga(cargar, clave = '') {
  const [estado, setEstado] = useState({ datos: null, error: '', cargando: true });
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let activo = true;
    cargar()
      .then((datos) => activo && setEstado({ datos, error: '', cargando: false }))
      .catch((e) => activo && setEstado({ datos: null, error: e.message, cargando: false }));
    return () => {
      activo = false;
    };
    // `cargar` se define en cada render: la recarga la controlan `clave` y `vuelta`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, vuelta]);
  const recargar = useCallback(() => setVuelta((n) => n + 1), []);
  return { ...estado, recargar };
}

/** Ejecuta una acción mostrando "ocupado" y el error si falla. accion(fn) devuelve true si salió bien. */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const accion = useCallback(async (fn) => {
    setOcupado(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }, []);
  return { ocupado, error, setError, accion };
}

export function Estado({ cargando, error, children }) {
  if (error) return <Aviso tono="error">{error}</Aviso>;
  if (cargando) return <p className="text-ink-muted">Cargando…</p>;
  return children;
}

export function Panel({ titulo, acciones, children }) {
  return (
    <section className="flex flex-col gap-5 rounded-card border border-borde bg-card p-5 sm:p-7">
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {titulo && <h2 className="text-[24px] leading-tight">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

const tonos = {
  ok: 'bg-menta text-on-brand',
  pendiente: 'bg-amarillo text-on-brand',
  mal: 'bg-danger/10 text-danger',
  neutro: 'border border-borde text-ink-muted',
  info: 'bg-lavanda text-on-brand',
};
export function Etiqueta({ tono = 'neutro', children }) {
  return <span className={`inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${tonos[tono]}`}>{children}</span>;
}

/** Tabla con scroll horizontal propio en pantallas chicas (la página no se desborda). */
export function Tabla({ columnas, filas, clave, vacio = 'No hay nada para mostrar.' }) {
  if (!filas.length) return <p className="text-ink-muted">{vacio}</p>;
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
        <thead>
          <tr className="border-b-2 border-borde">
            {columnas.map((c) => (
              <th key={c.titulo} scope="col" className="px-3 py-2.5 text-[13px] font-bold text-ink-muted">
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={clave(f)} className="border-b border-borde align-top">
              {columnas.map((c) => (
                <td key={c.titulo} className="px-3 py-3">
                  {c.render(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Botón chico con texto (acciones secundarias dentro de tablas y tarjetas). */
export function BotonTexto({ peligro, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`min-h-11 rounded-full px-3 text-[15px] font-bold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 ${
        peligro ? 'text-danger' : 'text-ink'
      } ${className}`}
      {...props}
    />
  );
}

const fmtFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtFechaHora = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fecha = (iso) => (iso ? fmtFecha.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)) : '—');
export const fechaHora = (iso) => (iso ? fmtFechaHora.format(new Date(iso)) : '—');
