import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  const { pathname, hash } = useLocation();

  // Al cambiar de página, volver arriba; si hay ancla (/#sobre), ir a esa sección.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) el.scrollIntoView();
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
