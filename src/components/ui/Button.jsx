import { Link } from 'react-router-dom';

// Variantes del sistema de diseño (componente Button).
const variantes = {
  primario: 'bg-lavanda text-on-brand hover:bg-lavanda-deep',
  menta: 'bg-menta text-on-brand hover:brightness-95',
  amarillo: 'bg-amarillo text-on-brand hover:brightness-95',
  secundario: 'border-2 border-ink bg-transparent text-ink hover:bg-ink/5',
};

const tamanios = {
  sm: 'h-11 px-5 text-[15px]',
  md: 'h-12 px-6 text-base',
  lg: 'h-[52px] px-7 text-base',
};

export function buttonClasses({ variante = 'primario', size = 'md', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full font-bold no-underline transition-colors',
    'disabled:cursor-not-allowed disabled:bg-borde disabled:text-ink-muted disabled:border-transparent',
    variantes[variante],
    tamanios[size],
    className,
  ].join(' ');
}

export default function Button({ variante, size, className, type = 'button', ...props }) {
  return <button type={type} className={buttonClasses({ variante, size, className })} {...props} />;
}

export function ButtonLink({ variante, size, className, to, ...props }) {
  return <Link to={to} className={buttonClasses({ variante, size, className })} {...props} />;
}
