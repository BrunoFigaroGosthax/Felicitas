// Testimonios y obras sociales: de la base (se editan en Supabase) o, en modo demo, de src/data/contenido.js.
import { OBRAS_SOCIALES, TESTIMONIOS } from '../data/contenido.js';
import { supabase } from '../lib/supabase.js';
import { api, esperar, USE_MOCKS } from './api.js';

const ABIERTO = { mantenimiento: false, mensaje: null };
let ajustes = null;

/**
 * Ajustes del sitio (tabla `ajustes`): { mantenimiento, mensaje }. Se piden una vez por visita.
 * Si la base no responde en 3 s o falla, el sitio queda abierto.
 */
export function obtenerAjustes() {
  if (!supabase) return Promise.resolve(ABIERTO);
  ajustes ??= Promise.race([
    supabase
      .from('ajustes')
      .select('mantenimiento, mensaje')
      .maybeSingle()
      .then(({ data, error }) => (error || !data ? ABIERTO : data)),
    new Promise((listo) => setTimeout(() => listo(ABIERTO), 3000)),
  ]).catch(() => ABIERTO);
  return ajustes;
}

/** Testimonios generales (home): [{ texto, autor }]. */
export async function listarTestimonios() {
  if (!supabase) return TESTIMONIOS;
  // Filtro explícito: a un admin las políticas le dejan ver también los no publicados.
  const { data, error } = await supabase.from('testimonios').select('texto, autor').eq('publicado', true).is('curso_id', null).order('orden');
  return error ? [] : data;
}

/** Nombres de las obras sociales con las que atiende. */
export async function listarObrasSociales() {
  if (!supabase) return OBRAS_SOCIALES;
  // Filtro explícito: a un admin las políticas le dejan ver también las inactivas.
  const { data, error } = await supabase.from('obras_sociales').select('nombre').eq('activa', true).order('orden');
  return error ? [] : data.map((o) => o.nombre);
}

/**
 * Reseñas de Google del consultorio: { disponible, puntaje, total, verTodas, escribir, resenas[] }.
 * Si no están configuradas (o fallan), { disponible: false } y la home muestra los testimonios.
 */
export async function listarResenas() {
  if (USE_MOCKS) return { disponible: false };
  try {
    return await api('/resenas');
  } catch {
    return { disponible: false };
  }
}

/** Botón de arrepentimiento. Devuelve { codigo } de seguimiento. */
export async function enviarArrepentimiento(datos) {
  if (USE_MOCKS) {
    await esperar(500);
    return { codigo: `ARR-DEMO${Math.random().toString(16).slice(2, 6).toUpperCase()}` };
  }
  return api('/arrepentimiento', { method: 'POST', body: datos });
}
