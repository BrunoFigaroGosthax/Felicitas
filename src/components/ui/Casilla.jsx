import { useId } from 'react';

/** Casilla de verificación con etiqueta (que puede incluir enlaces) y error. Área táctil de 44px. */
export default function Casilla({ checked, onChange, error, children, className = '' }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex min-h-11 items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-6 w-6 flex-none cursor-pointer accent-menta-deep"
        />
        <label htmlFor={id} className="pt-0.5 text-[15px]">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
