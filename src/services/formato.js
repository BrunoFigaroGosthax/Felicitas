// Textos derivados de los datos de un curso (precio, meta de la card, duración).
const fmtPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const pesos = (n) => fmtPesos.format(n);

export function precioTexto(curso) {
  if (curso.precio === 0) return 'Gratis';
  return curso.precioTexto ?? pesos(curso.precio);
}

export function duracionTexto(segundos) {
  if (!segundos) return null;
  const min = Math.max(1, Math.round(segundos / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}`.trim();
}

/** Línea corta de la card: "Guía descargable", "Video · 12 min", "6 clases · $ 15.000". */
export function metaCurso(curso) {
  const n = curso.clases.length;
  if (n === 1) {
    const [c] = curso.clases;
    if (c.tipo === 'pdf') return 'Guía descargable';
    return c.duracion ? `Video · ${c.duracion}` : 'Video';
  }
  return curso.precio === 0 ? `${n} clases` : `${n} clases · ${precioTexto(curso)}`;
}
