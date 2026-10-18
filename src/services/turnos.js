// Turnos. El frontend nunca habla directo con DrApp: siempre pasa por el backend (server/),
// que guarda las credenciales. Con VITE_USE_MOCKS=true (por defecto) usa datos de ejemplo.
import { api, USE_MOCKS, esperar } from './api.js';

const HORARIOS = ['09:00', '09:30', '10:00', '10:30', '11:00', '16:00', '16:30', '17:00'];

/** Fecha local (no UTC, para no correr el día en Argentina) como 'YYYY-MM-DD'. */
export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Próximos `cantidad` días hábiles a partir de mañana, como 'YYYY-MM-DD'. */
export function proximosDiasHabiles(cantidad = 5, desde = new Date()) {
  const dias = [];
  const d = new Date(desde);
  while (dias.length < cantidad) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) dias.push(fechaLocal(d));
  }
  return dias;
}

/** Devuelve [{ hora: '09:00', disponible: true }] para una fecha. */
export async function obtenerDisponibilidad(fecha) {
  if (USE_MOCKS) {
    await esperar(250);
    const semilla = Number(fecha.slice(-2));
    return HORARIOS.map((hora, i) => ({ hora, disponible: (i + semilla) % 4 !== 0 }));
  }
  const data = await api(`/turnos/disponibilidad?fecha=${encodeURIComponent(fecha)}`);
  return data.horarios;
}

/** Reserva un turno. Devuelve { id, fecha, hora }. */
export async function reservarTurno(datos) {
  if (USE_MOCKS) {
    await esperar(500);
    return { id: `demo-${Date.now()}`, fecha: datos.fecha, hora: datos.hora };
  }
  return api('/turnos', { method: 'POST', body: datos });
}
