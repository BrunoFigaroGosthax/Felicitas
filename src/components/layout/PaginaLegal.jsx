import useTitulo from '../../hooks/useTitulo.js';
import { TERMINOS_ACTUALIZADOS, TERMINOS_VERSION } from '../../data/legal.js';

/** Estructura común de las páginas legales: título, versión y texto con estilos de lectura. */
export default function PaginaLegal({ titulo, children }) {
  useTitulo(titulo);
  return (
    <div className="container-page py-10 sm:py-14 lg:pb-24">
      <article className="legal mx-auto flex max-w-[760px] flex-col gap-4">
        <h1 className="text-[clamp(34px,4.4vw,48px)] leading-[1.05]">{titulo}</h1>
        <p className="text-sm font-semibold text-ink-muted">
          Versión {TERMINOS_VERSION} · Última actualización: {TERMINOS_ACTUALIZADOS}
        </p>
        <p className="rounded-bloque bg-amarillo p-4 font-semibold">
          [Borrador: este texto tiene que revisarlo un abogado antes de publicar el sitio.]
        </p>
        {children}
      </article>
    </div>
  );
}
