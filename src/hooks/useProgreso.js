import { useCallback, useEffect, useState } from 'react';
import { useSesion } from '../context/Sesion.jsx';
import { supabase } from '../lib/supabase.js';
import { guardarPosicion, leerPosiciones, leerProgreso, marcarCompletada } from '../services/progreso.js';

/**
 * Progreso de un curso: clases completadas y minuto donde quedó cada video.
 * Con sesión (y Supabase) se guarda en la cuenta y sigue entre dispositivos; sin sesión, en este
 * navegador. `enCuenta` dice cuál de los dos.
 */
export default function useProgreso(curso) {
  const { usuario } = useSesion();
  const enCuenta = Boolean(supabase && usuario);
  const [vistas, setVistas] = useState([]);
  const [posiciones, setPosiciones] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!curso) return;
    let activo = true;
    leerProgreso(curso, enCuenta)
      .then((v) => activo && setVistas(v))
      .catch((e) => activo && setError(e.message));
    leerPosiciones(curso, enCuenta).then((p) => activo && setPosiciones(p));
    return () => {
      activo = false;
    };
  }, [curso, enCuenta]);

  const marcarVista = useCallback(
    async (claseId) => {
      setError('');
      setVistas((prev) => (prev.includes(claseId) ? prev : [...prev, claseId]));
      try {
        await marcarCompletada(curso, claseId, enCuenta);
      } catch (e) {
        setVistas((prev) => prev.filter((id) => id !== claseId));
        setError(e.message);
      }
    },
    [curso, enCuenta],
  );

  /** Guarda el minuto del video (si falla, no molesta: se reintenta con el próximo guardado). */
  const recordarPosicion = useCallback(
    (claseId, segundos) => {
      setPosiciones((p) => ({ ...p, [claseId]: segundos }));
      guardarPosicion(curso, claseId, segundos, enCuenta).catch(() => {});
    },
    [curso, enCuenta],
  );

  return { vistas, marcarVista, posiciones, recordarPosicion, enCuenta, error };
}
