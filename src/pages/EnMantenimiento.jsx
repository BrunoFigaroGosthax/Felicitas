import { buttonClasses } from '../components/ui/Button.jsx';
import { CONTACTO } from '../data/contenido.js';
import useTitulo from '../hooks/useTitulo.js';

/** Aviso que ve el público mientras el sitio está en mantenimiento (tabla `ajustes`). */
export default function EnMantenimiento({ mensaje }) {
  useTitulo('Volvemos en un rato');
  return (
    <section className="relative overflow-hidden bg-amarillo">
      <svg
        viewBox="0 0 1440 520"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      >
        <path d="M980 -40 C 900 120, 1120 200, 1060 330 S 1180 520, 1320 470 S 1480 300, 1520 380" fill="none" stroke="var(--color-menta)" strokeWidth="34" strokeLinecap="round" />
        <path d="M1500 60 C 1360 40, 1300 170, 1200 140 S 1060 -10, 940 60" fill="none" stroke="var(--color-lavanda)" strokeWidth="34" strokeLinecap="round" />
      </svg>
      <div className="container-page relative flex min-h-[60vh] flex-col justify-center gap-5 py-16 sm:py-24">
        <p className="eyebrow">Pediatría con propósito</p>
        <h1 className="max-w-[640px] text-[clamp(36px,5vw,58px)] leading-[1.04]">Estamos haciendo unos ajustes</h1>
        <p className="max-w-[540px] whitespace-pre-line text-[clamp(16px,1.6vw,19px)] leading-relaxed">
          {mensaje || 'Estamos actualizando la página. En un rato vas a poder volver a pedir turnos y ver los cursos.'}
        </p>
        <p className="max-w-[540px] text-[clamp(16px,1.6vw,19px)] leading-relaxed">Si necesitás comunicarte, escribinos.</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a href={CONTACTO.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: 'lg' })}>
            WhatsApp
          </a>
          <a href={CONTACTO.instagramUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: 'lg', variante: 'secundario' })}>
            Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
