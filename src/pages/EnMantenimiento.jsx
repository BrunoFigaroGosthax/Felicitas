import { Link } from 'react-router-dom';
import { CONTACTO } from '../data/contenido.js';
import useTitulo from '../hooks/useTitulo.js';

const enlace = 'eyebrow border-b border-ink/40 pb-1 text-ink transition-colors hover:border-ink';

/** Pantalla completa que ve el público mientras el sitio está en mantenimiento (tabla `ajustes`). Sin encabezado ni pie. */
export default function EnMantenimiento({ mensaje }) {
  useTitulo('Volvemos en un rato');
  return (
    <main id="contenido" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-page px-4 py-16">
      {/* Ondas en las esquinas, lejos del texto */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      >
        <path d="M1180 -40 C 1140 90, 1300 140, 1260 240 S 1360 360, 1480 330" fill="none" stroke="var(--color-menta)" strokeWidth="30" strokeLinecap="round" />
        <path d="M1500 140 C 1400 120, 1360 40, 1290 20" fill="none" stroke="var(--color-lavanda)" strokeWidth="30" strokeLinecap="round" />
        <path d="M-40 640 C 80 600, 120 760, 230 730 S 330 860, 300 960" fill="none" stroke="var(--color-amarillo)" strokeWidth="30" strokeLinecap="round" />
      </svg>

      <div className="relative flex max-w-[600px] flex-col items-center gap-6 text-center">
        <img src="/img/logo-principal.png" alt="Felicitas, pediatría con propósito" className="w-[220px] max-w-full sm:w-[260px]" />
        <span aria-hidden="true" className="h-px w-16 bg-menta-deep/50" />
        <h1 className="text-[clamp(30px,4.4vw,48px)] leading-[1.1]">Estamos actualizando la página</h1>
        <p className="whitespace-pre-line text-[clamp(16px,1.5vw,18px)] leading-relaxed text-ink-muted">
          {mensaje || 'Volvemos en un rato con los turnos y los cursos al día. ¡Gracias por la paciencia!'}
        </p>
        <div className="flex flex-wrap justify-center gap-8 pt-2">
          <a href={CONTACTO.instagramUrl} target="_blank" rel="noopener noreferrer" className={enlace}>
            Instagram
          </a>
          <a href={CONTACTO.whatsappUrl} target="_blank" rel="noopener noreferrer" className={enlace}>
            WhatsApp
          </a>
        </div>
        <Link to="/ingresar?volver=/admin" className="mt-6 inline-flex min-h-11 items-center px-3 text-sm text-ink-muted/70 hover:text-ink-muted">
          Acceso administrador
        </Link>
      </div>
    </main>
  );
}
