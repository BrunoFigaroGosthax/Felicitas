// Iconos de trazo (2px, extremos redondeados), según el sistema de diseño.
const paths = {
  corazon: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,
  termometro: <path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0z" />,
  familia: (
    <>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15 15.2c3 .1 5 2 5 4.8" />
    </>
  ),
  charla: (
    <>
      <path d="M4 5h16v11H8l-4 4z" />
      <path d="M8 10h8" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  descargar: (
    <>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  documento: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </>
  ),
};

export default function Icono({ nombre, size = 24, strokeWidth = 2, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[nombre]}
    </svg>
  );
}
