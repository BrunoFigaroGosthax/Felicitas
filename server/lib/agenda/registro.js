// Dónde se guarda qué "ocupado" se creó en cada sistema (tabla agenda_bloqueos).
import { sinError } from '../supabase.js';

const CLAVE = 'origen_sistema,origen_id,destino_sistema';

export function registroSupabase(admin) {
  const tabla = () => admin.from('agenda_bloqueos');
  return {
    deOrigen: async (sistema, id) => sinError(await tabla().select('*').eq('origen_sistema', sistema).eq('origen_id', id), 'agenda_bloqueos'),
    enDestino: async (sistema) => sinError(await tabla().select('*').eq('destino_sistema', sistema), 'agenda_bloqueos'),
    activos: async (desde) => sinError(await tabla().select('*').gte('fecha', desde), 'agenda_bloqueos'),
    esBloqueo: async (sistema, id) =>
      sinError(await tabla().select('id').eq('destino_sistema', sistema).eq('bloqueo_id', id).limit(1), 'agenda_bloqueos').length > 0,
    guardar: async (reg) => {
      const { id: _id, created_at: _c, updated_at: _u, ...fila } = reg;
      sinError(await tabla().upsert(fila, { onConflict: CLAVE }), 'agenda_bloqueos');
    },
    borrar: async (id) => sinError(await tabla().delete().eq('id', id), 'agenda_bloqueos'),
  };
}

/** En memoria: para desarrollo sin Supabase y para las pruebas. */
export function registroMemoria() {
  const filas = [];
  let n = 0;
  const clave = (r) => `${r.origen_sistema}|${r.origen_id}|${r.destino_sistema}`;
  return {
    filas,
    deOrigen: async (sistema, id) => filas.filter((r) => r.origen_sistema === sistema && r.origen_id === id).map((r) => ({ ...r })),
    enDestino: async (sistema) => filas.filter((r) => r.destino_sistema === sistema).map((r) => ({ ...r })),
    activos: async (desde) => filas.filter((r) => r.fecha >= desde).map((r) => ({ ...r })),
    esBloqueo: async (sistema, id) => filas.some((r) => r.destino_sistema === sistema && r.bloqueo_id === id),
    guardar: async (reg) => {
      const i = filas.findIndex((r) => clave(r) === clave(reg));
      if (i >= 0) filas[i] = { ...filas[i], ...reg, id: filas[i].id };
      else filas.push({ ...reg, id: `r${++n}` });
    },
    borrar: async (id) => {
      const i = filas.findIndex((r) => r.id === id);
      if (i >= 0) filas.splice(i, 1);
    },
  };
}
