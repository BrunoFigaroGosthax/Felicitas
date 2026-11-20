import { useEffect, useState } from 'react';
import { ajustesYa, escucharAjustes, obtenerAjustes } from '../services/contenido.js';

/** Ajustes del sitio (mantenimiento, imágenes). null mientras llegan; se actualizan si cambian desde el panel. */
export default function useAjustes() {
  const [ajustes, setAjustes] = useState(ajustesYa);
  useEffect(() => {
    obtenerAjustes().then(setAjustes);
    return escucharAjustes(setAjustes);
  }, []);
  return ajustes;
}
