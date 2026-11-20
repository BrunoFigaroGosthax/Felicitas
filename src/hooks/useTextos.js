import { useMemo } from 'react';
import { textosDelSitio } from '../lib/textos.js';
import useAjustes from './useAjustes.js';

/** { inicio, contacto, sedes }: textos originales con los cambios hechos desde el panel. */
export default function useTextos() {
  const ajustes = useAjustes();
  return useMemo(() => textosDelSitio(ajustes?.textos), [ajustes]);
}
