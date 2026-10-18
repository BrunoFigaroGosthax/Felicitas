const tonos = {
  gratis: 'bg-menta text-on-brand',
  pago: 'bg-lavanda text-on-brand',
  nuevo: 'bg-amarillo text-on-brand',
  formato: 'border border-borde text-ink-muted',
};

export default function Badge({ tono = 'formato', children }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold ${tonos[tono]}`}>
      {children}
    </span>
  );
}
