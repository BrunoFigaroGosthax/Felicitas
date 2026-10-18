export const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const esEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const esTelefono = (s) => typeof s === 'string' && /^[\d\s()+-]{8,20}$/.test(s);

/** Texto recortado; null si no es string o queda vacío. */
export function texto(s, max = 200) {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t ? t.slice(0, max) : null;
}

/** Fecha válida del calendario (no solo el formato). */
export function esFechaReal(iso) {
  if (!FECHA.test(iso || '')) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso);
}
