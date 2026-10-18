import { useId } from 'react';

const base =
  'w-full rounded-campo border bg-card px-4 text-base text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-[3px] focus:ring-lavanda';

/**
 * Campo con etiqueta, ayuda y error (componente Field del sistema).
 * as: 'input' | 'select' | 'textarea'
 */
export default function Field({ label, ayuda, error, as = 'input', children, className = '', ...props }) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;
  const borde = error ? 'border-2 border-danger' : 'border-borde focus:border-2 focus:border-ink';
  const describedBy = ayuda || error ? ayudaId : undefined;
  const comunes = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, ...props };

  let control;
  if (as === 'select') {
    control = (
      <select className={`${base} ${borde} h-12 px-3`} {...comunes}>
        {children}
      </select>
    );
  } else if (as === 'textarea') {
    control = <textarea className={`${base} ${borde} min-h-28 resize-y py-3`} {...comunes} />;
  } else {
    control = <input className={`${base} ${borde} h-12`} {...comunes} />;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {control}
      {(error || ayuda) && (
        <p id={ayudaId} className={`text-sm font-medium ${error ? 'text-danger' : 'text-ink-muted'}`}>
          {error || ayuda}
        </p>
      )}
    </div>
  );
}
