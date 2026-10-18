// Patrón de ondas del manual de marca (p.8). Decorativo: nunca detrás de texto corrido.
const trazos = {
  a: 'M-10 60 C 60 0, 120 140, 190 80 S 300 10, 380 70',
  b: 'M-10 100 C 50 30, 130 140, 200 70 S 320 20, 380 90',
  c: 'M-10 70 C 60 130, 120 10, 190 60 S 300 140, 380 50',
  d: 'M-10 128 C 80 96, 150 160, 230 116 S 330 90, 380 126',
};

const colores = {
  lavanda: 'var(--color-lavanda)',
  menta: 'var(--color-menta)',
  amarillo: 'var(--color-amarillo)',
};

export default function Ondas({ lineas = [{ trazo: 'a', color: 'menta' }], grosor = 20, className = '' }) {
  return (
    <svg
      viewBox="0 0 360 150"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`block h-full w-full ${className}`}
    >
      {lineas.map((l, i) => (
        <path
          key={i}
          d={trazos[l.trazo]}
          fill="none"
          stroke={colores[l.color]}
          strokeWidth={grosor}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
