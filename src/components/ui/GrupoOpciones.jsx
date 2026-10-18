import { useLayoutEffect, useRef } from 'react';

const TECLAS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Radiogroup con navegación por teclado (patrón WAI-ARIA): Tab entra al grupo una sola vez,
 * las flechas, Inicio y Fin cambian la opción. Envuelve varios <OpcionChip>.
 */
export default function GrupoOpciones({ className = '', children, ...props }) {
  const ref = useRef(null);
  const radios = () => [...ref.current.querySelectorAll('[role="radio"]:not(:disabled)')];

  // Solo la opción elegida (o la primera habilitada) entra en el orden de Tab.
  useLayoutEffect(() => {
    const lista = radios();
    const activa = lista.find((r) => r.getAttribute('aria-checked') === 'true') || lista[0];
    lista.forEach((r) => {
      r.tabIndex = r === activa ? 0 : -1;
    });
  });

  function onKeyDown(e) {
    const lista = radios();
    const i = lista.indexOf(document.activeElement);
    if (i === -1) return;
    let destino;
    if (e.key in TECLAS) destino = (i + TECLAS[e.key] + lista.length) % lista.length;
    else if (e.key === 'Home') destino = 0;
    else if (e.key === 'End') destino = lista.length - 1;
    else return;
    e.preventDefault();
    lista[destino].focus();
    lista[destino].click();
  }

  return (
    <div ref={ref} role="radiogroup" onKeyDown={onKeyDown} className={className} {...props}>
      {children}
    </div>
  );
}
