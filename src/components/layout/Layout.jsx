import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSesion } from '../../context/Sesion.jsx';
import EnMantenimiento from '../../pages/EnMantenimiento.jsx';
import { obtenerAjustes } from '../../services/contenido.js';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

// En mantenimiento siguen abiertas: el ingreso (para que entren los admin), el panel, cancelar un turno y los legales.
const SIEMPRE_ABIERTAS = ['/ingresar', '/crear-cuenta', '/recuperar', '/nueva-clave', '/turnos/cancelar', '/privacidad', '/terminos', '/arrepentimiento'];

/** Qué va en <main>: la página, el aviso de mantenimiento, o nada mientras se decide (evita mostrar y sacar). */
function useContenido(pathname) {
  const [ajustes, setAjustes] = useState(null);
  const { esAdmin, cargando } = useSesion();
  useEffect(() => {
    obtenerAjustes().then(setAjustes);
  }, []);

  const abierta = pathname.startsWith('/admin') || SIEMPRE_ABIERTAS.includes(pathname.replace(/\/$/, ''));
  const enMantenimiento = Boolean(ajustes?.mantenimiento);
  const aviso = enMantenimiento && esAdmin === true;
  if (abierta) return { pagina: <Outlet />, aviso };
  if (!ajustes) return { pagina: null, aviso };
  if (!enMantenimiento) return { pagina: <Outlet />, aviso };
  if (cargando || esAdmin === null) return { pagina: null, aviso };
  return { pagina: esAdmin ? <Outlet /> : null, cerrado: !esAdmin && ajustes, aviso };
}

export default function Layout() {
  const { pathname, hash } = useLocation();
  const { pagina, cerrado, aviso } = useContenido(pathname);

  // Al cambiar de página, volver arriba; si hay ancla (/#sobre), ir a esa sección.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) el.scrollIntoView();
  }, [pathname, hash]);

  if (cerrado) return <EnMantenimiento mensaje={cerrado.mensaje} />;
  if (pagina === null) return null; // un instante, mientras se sabe si el sitio está abierto
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>
      {aviso && (
        <p role="status" className="bg-lavanda px-4 py-2 text-center text-[15px] font-bold text-on-brand">
          Sitio en mantenimiento: el público ve un aviso. Vos lo ves completo porque tu cuenta es administradora.
        </p>
      )}
      <Header />
      <main id="contenido" className="flex-1">
        {pagina}
      </main>
      <Footer />
    </div>
  );
}
