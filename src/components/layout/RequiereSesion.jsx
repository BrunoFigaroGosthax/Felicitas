import { Navigate, useLocation } from 'react-router-dom';
import { useSesion } from '../../context/Sesion.jsx';

/** Muestra la página solo con sesión iniciada; si no, manda a ingresar y vuelve después. */
export default function RequiereSesion({ children }) {
  const { usuario, cargando } = useSesion();
  const { pathname, search } = useLocation();
  if (cargando) return <p className="container-page py-16 text-ink-muted">Cargando…</p>;
  if (!usuario) return <Navigate to={`/ingresar?volver=${encodeURIComponent(pathname + search)}`} replace />;
  return children;
}

/** Destino seguro para ?volver= (solo rutas internas: evita redirigir a otro sitio). */
export function destinoSeguro(volver, porDefecto = '/mi-cuenta') {
  return volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : porDefecto;
}
