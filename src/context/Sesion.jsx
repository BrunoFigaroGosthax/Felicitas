import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { escucharSesion, obtenerSesion } from '../services/auth.js';

const SesionContext = createContext({ sesion: null, usuario: null, esAdmin: false, cargando: true });

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(undefined); // undefined = todavía no se sabe
  const [rol, setRol] = useState({ uid: null, admin: false });

  useEffect(() => {
    let activo = true;
    obtenerSesion().then((s) => activo && setSesion(s ?? null));
    const dejar = escucharSesion((s) => setSesion(s ?? null));
    return () => {
      activo = false;
      dejar();
    };
  }, []);

  // El rol se lee del perfil (la base es la que decide qué puede hacer cada uno).
  const uid = sesion?.usuario?.id;
  useEffect(() => {
    if (!uid || !supabase) return;
    let activo = true;
    supabase
      .from('perfiles')
      .select('rol')
      .eq('id', uid)
      .single()
      .then(({ data }) => activo && setRol({ uid, admin: data?.rol === 'admin' }));
    return () => {
      activo = false;
    };
  }, [uid]);

  // esAdmin: true / false, o null mientras se consulta el rol del usuario recién ingresado.
  const esAdmin = !uid || !supabase ? false : rol.uid === uid ? rol.admin : null;
  const valor = { sesion: sesion ?? null, usuario: sesion?.usuario ?? null, esAdmin, cargando: sesion === undefined };
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

/** { sesion, usuario, esAdmin, cargando } */
export const useSesion = () => useContext(SesionContext);
