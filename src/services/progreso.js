// Progreso de los cursos: en la cuenta (Supabase) si hay sesión; si no, en este navegador.
import { supabase } from '../lib/supabase.js';
import { obtenerSesion } from './auth.js';

const clave = (slug) => `felicitas:progreso:${slug}`;

export function progresoLocal(slug) {
  try {
    return JSON.parse(localStorage.getItem(clave(slug))) || [];
  } catch {
    return [];
  }
}

/** IDs de las clases completadas del curso. */
export async function leerProgreso(curso, enCuenta) {
  if (!enCuenta) return progresoLocal(curso.slug);
  const { data, error } = await supabase
    .from('progreso')
    .select('clase_id')
    .in('clase_id', curso.clases.map((c) => c.id))
    .not('completada_at', 'is', null);
  if (error) throw new Error('No pudimos cargar tu progreso.');
  return data.map((p) => p.clase_id);
}

// ---- Minuto donde quedó cada video: { [claseId]: segundos } ----
const clavePosicion = (slug) => `felicitas:posicion:${slug}`;

function posicionesLocales(slug) {
  try {
    return JSON.parse(localStorage.getItem(clavePosicion(slug))) || {};
  } catch {
    return {};
  }
}

export async function leerPosiciones(curso, enCuenta) {
  if (!enCuenta) return posicionesLocales(curso.slug);
  const { data, error } = await supabase
    .from('progreso')
    .select('clase_id, posicion_segundos')
    .in('clase_id', curso.clases.map((c) => c.id))
    .gt('posicion_segundos', 0);
  if (error) return {};
  return Object.fromEntries(data.map((p) => [p.clase_id, p.posicion_segundos]));
}

export async function guardarPosicion(curso, claseId, segundos, enCuenta) {
  const s = Math.max(0, Math.floor(segundos));
  if (!enCuenta) {
    try {
      localStorage.setItem(clavePosicion(curso.slug), JSON.stringify({ ...posicionesLocales(curso.slug), [claseId]: s }));
    } catch {
      /* sin almacenamiento */
    }
    return;
  }
  const sesion = await obtenerSesion();
  // Solo la posición: si la clase ya estaba completada, el upsert no la toca.
  await supabase.from('progreso').upsert({ usuario_id: sesion.usuario.id, clase_id: claseId, posicion_segundos: s }, { onConflict: 'usuario_id,clase_id' });
}

export async function marcarCompletada(curso, claseId, enCuenta) {
  if (!enCuenta) {
    const vistas = progresoLocal(curso.slug);
    if (vistas.includes(claseId)) return;
    try {
      localStorage.setItem(clave(curso.slug), JSON.stringify([...vistas, claseId]));
    } catch {
      /* sin almacenamiento: el progreso vive solo en esta sesión */
    }
    return;
  }
  const sesion = await obtenerSesion();
  const { error } = await supabase
    .from('progreso')
    .upsert(
      { usuario_id: sesion.usuario.id, clase_id: claseId, completada_at: new Date().toISOString() },
      { onConflict: 'usuario_id,clase_id' },
    );
  if (error) throw new Error('No pudimos guardar tu progreso. Probá de nuevo.');
}
