import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ButtonLink } from '../ui/Button.jsx';
import { useSesion } from '../../context/Sesion.jsx';

const links = [
  { to: '/#sobre', label: 'Sobre mí' },
  { to: '/#consultas', label: 'Consultas' },
  { to: '/cursos', label: 'Cursos' },
  { to: '/#contacto', label: 'Contacto' },
];

export default function Header() {
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();
  const { usuario, esAdmin } = useSesion();
  const cuenta = usuario ? { to: '/mi-cuenta', label: 'Mi cuenta' } : { to: '/ingresar', label: 'Ingresar' };

  // Cerrar el menú móvil al navegar.
  useEffect(() => setAbierto(false), [location]);

  // Los enlaces con # son anclas de la home: no se marcan como activos.
  const linkClass = (to) => ({ isActive }) =>
    `block rounded-full px-1 py-2.5 font-semibold text-ink hover:underline underline-offset-[6px] ${
      isActive && !to.includes('#') ? 'underline decoration-[3px]' : ''
    }`;

  return (
    <header className="sticky top-0 z-40 bg-amarillo">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link to="/" aria-label="Felicitas, inicio" className="block shrink-0 leading-none">
          <img
            src="/img/logo-principal.png"
            alt="Felicitas, pediatría con propósito"
            width="900"
            height="363"
            className="h-12 w-auto sm:h-14"
          />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-6 text-[15px] lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass(l.to)} end>
              {l.label}
            </NavLink>
          ))}
          {esAdmin && (
            <NavLink to="/admin" className={linkClass('/admin')}>
              Panel
            </NavLink>
          )}
          <NavLink to={cuenta.to} className={linkClass(cuenta.to)} end>
            {cuenta.label}
          </NavLink>
          <ButtonLink to="/turnos" size="sm">
            Pedir turno
          </ButtonLink>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-card lg:hidden"
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {abierto && (
        <nav id="menu-movil" aria-label="Principal" className="border-t border-ink/10 lg:hidden">
          <div className="container-page flex flex-col gap-1 py-4 text-lg">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass(l.to)} end>
                {l.label}
              </NavLink>
            ))}
            {esAdmin && (
              <NavLink to="/admin" className={linkClass('/admin')}>
                Panel
              </NavLink>
            )}
            <NavLink to={cuenta.to} className={linkClass(cuenta.to)} end>
              {cuenta.label}
            </NavLink>
            <ButtonLink to="/turnos" className="mt-3 w-full">
              Pedir turno
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
