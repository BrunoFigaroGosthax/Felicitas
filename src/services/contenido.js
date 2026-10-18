// Testimonios y obras sociales: de la base (se editan en Supabase) o, en modo demo, de src/data/contenido.js.
import { OBRAS_SOCIALES, TESTIMONIOS } from '../data/contenido.js';
import { supabase } from '../lib/supabase.js';
import { api, esperar, USE_MOCKS } from './api.js';

/** Testimonios generales (home): [{ texto, autor }]. */
export async function listarTestimonios() {
  if (!supabase) return TESTIMONIOS;
  const { data, error } = await supabase.from('testimonios').select('texto, autor').is('curso_id', null).order('orden');
  return error ? [] : data;
}

/** Nombres de las obras sociales con las que atiende. */
export async function listarObrasSociales() {
  if (!supabase) return OBRAS_SOCIALES;
  const { data, error } = await supabase.from('obras_sociales').select('nombre').order('orden');
  return error ? [] : data.map((o) => o.nombre);
}

/** Botón de arrepentimiento. Devuelve { codigo } de seguimiento. */
export async function enviarArrepentimiento(datos) {
  if (USE_MOCKS) {
    await esperar(500);
    return { codigo: `ARR-DEMO${Math.random().toString(16).slice(2, 6).toUpperCase()}` };
  }
  return api('/arrepentimiento', { method: 'POST', body: datos });
}
