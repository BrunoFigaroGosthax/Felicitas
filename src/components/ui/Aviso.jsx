const tonos = {
  error: 'bg-danger/10 text-danger',
  ok: 'bg-menta/40 text-ink',
  info: 'bg-lila-suave text-ink',
};

/** Mensaje en bloque: errores (anunciados a lectores de pantalla), confirmaciones o notas. */
export default function Aviso({ tono = 'info', children, className = '' }) {
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`rounded-bloque p-4 font-medium ${tonos[tono]} ${className}`}>
      {children}
    </div>
  );
}
