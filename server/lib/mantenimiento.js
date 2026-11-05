// Modo mantenimiento (tabla `ajustes`). La web muestra el aviso; acá se frenan reservas y compras
// por si alguien tenía la página abierta de antes. Cancelar turnos, arrepentimiento, webhooks y crons siguen.
import { errorPublico, handler } from './errores.js';
import { admin } from './supabase.js';

const MEDIO_MINUTO = 30_000;
let cache = { valor: false, hasta: 0 };

export async function enMantenimiento() {
  if (!admin) return false;
  if (Date.now() < cache.hasta) return cache.valor;
  const { data, error } = await admin.from('ajustes').select('mantenimiento').maybeSingle();
  // Si no se puede leer (por ejemplo, migración sin correr), el sitio sigue abierto.
  cache = { valor: !error && Boolean(data?.mantenimiento), hasta: Date.now() + MEDIO_MINUTO };
  return cache.valor;
}

export const cerradoEnMantenimiento = handler(async (_req, _res, next) => {
  if (await enMantenimiento()) throw errorPublico(503, 'Estamos haciendo unos ajustes en la página. Probá de nuevo en un rato.');
  next();
});
