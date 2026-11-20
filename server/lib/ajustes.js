// Ajustes del sitio (tabla `ajustes`, una fila) leídos desde el servidor, con caché de medio minuto.
// Nunca lanzan: si la base no responde, se usan los valores por defecto.
import { admin } from './supabase.js';

const MEDIO_MINUTO = 30_000;
let cache = { fila: null, hasta: 0 };

export async function leerAjustes() {
  if (!admin) return {};
  if (Date.now() < cache.hasta) return cache.fila || {};
  try {
    const { data, error } = await admin.from('ajustes').select('*').maybeSingle();
    cache = { fila: error ? null : data, hasta: Date.now() + MEDIO_MINUTO };
  } catch {
    cache = { fila: null, hasta: Date.now() + MEDIO_MINUTO };
  }
  return cache.fila || {};
}

/** Dónde son los turnos que se reservan por la web (CIEV), con lo cargado en Panel → Textos. */
export async function lugarTurnos() {
  const ciev = (await leerAjustes()).textos?.sedes?.ciev || {};
  const nombre = ciev.nombre?.trim() || 'CIEV';
  const direccion = ciev.direccion?.trim() || 'Entre Ríos 1152, Neuquén';
  return `${nombre}, ${direccion}`;
}
