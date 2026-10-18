import { createContext, useContext, useEffect, useState } from 'react';
import { escucharSesion, obtenerSesion } from '../services/auth.js';

const SesionContext = createContext({ sesion: null, usuario: null, cargando: true });

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(undefined); // undefined = todavía no se sabe

  useEffect(() => {
    let activo = true;
    obtenerSesion().then((s) => activo && setSesion(s ?? null));
    const dejar = escucharSesion((s) => setSesion(s ?? null));
    return () => {
      activo = false;
      dejar();
    };
  }, []);

  const valor = { sesion: sesion ?? null, usuario: sesion?.usuario ?? null, cargando: sesion === undefined };
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

/** { sesion, usuario, cargando } */
export const useSesion = () => useContext(SesionContext);
