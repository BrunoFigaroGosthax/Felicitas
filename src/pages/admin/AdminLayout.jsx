import { Suspense } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import Aviso from '../../components/ui/Aviso.jsx';
import { useSesion } from '../../context/Sesion.jsx';
import useTitulo from '../../hooks/useTitulo.js';
import { supabase } from '../../lib/supabase.js';

const SECCIONES = [
  { to: 'cursos', label: 'Cursos' },
  { to: 'ventas', label: 'Ventas' },
  { to: 'alumnos', label: 'Alumnos' },
  { to: 'cupones', label: 'Cupones' },
  { to: 'turnos', label: 'Turnos' },
  { to: 'arrepentimientos', label: 'Arrepentimientos' },
  { to: 'contenido', label: 'Contenido' },
  { to: 'cuenta', label: 'Mis datos' },
];

export default function AdminLayout() {
  useTitulo('Panel');
  const { usuario, esAdmin, cargando } = useSesion();
  const { pathname } = useLocation();

  let cuerpo;
  if (!supabase) cuerpo = <Aviso tono="error">El panel necesita Supabase conectado (VITE_USE_MOCKS=false en .env).</Aviso>;
  else if (cargando || (usuario && esAdmin === null)) cuerpo = <p className="text-ink-muted">Cargando…</p>;
  else if (!usuario) return <Navigate to={`/ingresar?volver=${encodeURIComponent(pathname)}`} replace />;
  else if (!esAdmin) cuerpo = <Aviso tono="error">Tu cuenta no tiene permiso para usar el panel.</Aviso>;
  else {
    cuerpo = (
      <>
        <nav aria-label="Secciones del panel" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SECCIONES.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                `inline-flex h-11 flex-none items-center rounded-full px-5 text-[15px] font-bold ${
                  isActive ? 'bg-lavanda text-on-brand' : 'border border-borde bg-card text-ink hover:border-lavanda-deep'
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
        <Suspense fallback={<p className="text-ink-muted">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </>
    );
  }

  return (
    <div className="container-page flex flex-col gap-6 py-8 sm:py-12 lg:pb-24">
      <div className="flex flex-col gap-1.5">
        <p className="eyebrow text-menta-deep">Administración</p>
        <h1 className="text-[clamp(32px,4vw,46px)] leading-[1.05]">Panel</h1>
      </div>
      {cuerpo}
    </div>
  );
}
