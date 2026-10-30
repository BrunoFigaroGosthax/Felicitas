// Turnos. El frontend nunca habla directo con DrApp: siempre pasa por el backend (server/),
// que guarda las credenciales. Con VITE_USE_MOCKS=true (por defecto) usa datos de ejemplo.
import { api, USE_MOCKS, esperar } from './api.js';

// Modo demo: horarios de CIEV (martes de 17 a 21 h, cada 30 minutos). Los reales los da DrApp.
const HORARIOS = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

/** Fecha local (no UTC, para no correr el día en Argentina) como 'YYYY-MM-DD'. */
export function fechaLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Próximos `cantidad` días de atención a partir de mañana, como 'YYYY-MM-DD'.
 * diasSemana: 0 = domingo … 6 = sábado (por defecto, lunes a viernes).
 */
export function proximosDiasHabiles(cantidad = 5, desde = new Date(), diasSemana = [1, 2, 3, 4, 5]) {
  const dias = [];
  const d = new Date(desde);
  while (dias.length < cantidad) {
    d.setDate(d.getDate() + 1);
    if (diasSemana.includes(d.getDay())) dias.push(fechaLocal(d));
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

/** Reserva un turno. Devuelve { id, fecha, hora }. Si el horario se ocupó recién, el error trae status 409. */
export async function reservarTurno(datos) {
  if (USE_MOCKS) {
    await esperar(500);
    return { id: `demo-${Date.now()}`, fecha: datos.fecha, hora: datos.hora };
  }
  return api('/turnos', { method: 'POST', body: datos });
}

// Cancelación con el link del email: { fecha, hora, motivo, estado, pasado }.
const DEMO_CANCELACION = { fecha: proximosDiasHabiles(2)[1], hora: '10:30', motivo: 'control', estado: 'reservado', pasado: false };

export async function turnoParaCancelar(token) {
  if (USE_MOCKS) {
    await esperar(300);
    return DEMO_CANCELACION;
  }
  return api(`/turnos/cancelar?t=${encodeURIComponent(token)}`);
}

export async function cancelarTurno(token) {
  if (USE_MOCKS) {
    await esperar(500);
    return { ...DEMO_CANCELACION, estado: 'cancelado' };
  }
  return api('/turnos/cancelar', { method: 'POST', body: { t: token } });
}
