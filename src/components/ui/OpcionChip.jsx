/**
 * Opción seleccionable de un radiogroup: horarios (TimeSlot), días y motivos.
 * Se marca con aria-checked además del color.
 */
export default function OpcionChip({ seleccionado, deshabilitado, onSelect, className = '', children, ...props }) {
  const estado = deshabilitado
    ? 'border border-dashed border-borde bg-transparent text-ink-muted line-through cursor-not-allowed'
    : seleccionado
      ? 'border-2 border-on-brand bg-lavanda text-on-brand'
      : 'border border-borde bg-card text-ink hover:border-lavanda-deep';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionado ? 'true' : 'false'}
      disabled={deshabilitado}
      onClick={onSelect}
      className={`transition-colors ${estado} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
