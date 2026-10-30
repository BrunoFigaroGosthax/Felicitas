/**
 * Adaptador de DrApp (sistema principal: ahí se guardan los turnos que se piden por la web).
 *
 * PENDIENTE: completar con la documentación de la API de DrApp (portal de desarrolladores,
 * credenciales, webhooks y entorno de prueba). Las credenciales van SOLO en variables del servidor.
 * Sin DRAPP_API_URL y DRAPP_API_KEY funciona con datos de ejemplo para poder desarrollar.
 *
 * Cada método tiene que cumplir el contrato descrito en ./nucleo.js.
 */
import { errorPublico } from '../errores.js';

// Datos de ejemplo: CIEV, martes de 17 a 21 h cada 30 minutos (la web solo ofrece martes).
const HORARIOS = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

const pendiente = () =>
  errorPublico(501, 'La agenda online no está disponible en este momento. Escribinos por WhatsApp.', 'Integración con DrApp sin implementar');

export function crearDrapp(env = process.env) {
  const real = Boolean(env.DRAPP_API_URL && env.DRAPP_API_KEY);

  return {
    id: 'drapp',
    nombre: 'DrApp',
    principal: true,
    real,

    async horarios(fecha) {
      if (!real) {
        const semilla = Number(fecha.slice(-2));
        return HORARIOS.map((hora, i) => ({ hora, disponible: (i + semilla) % 4 !== 0 }));
      }
      // TODO: agenda del día en DrApp → [{ hora: 'HH:MM', disponible }].
      throw pendiente();
    },

    async ocupados() {
      if (!real) return [];
      // TODO: turnos y bloqueos del día en DrApp → [{ hora, duracionMin }].
      throw pendiente();
    },

    async turnos() {
      if (!real) return [];
      // TODO: turnos (y "ocupado") entre dos fechas → [{ id, fecha, hora, duracionMin }].
      throw pendiente();
    },

    async reservar(datos) {
      if (!real) return { id: `demo-${Date.now()}`, fecha: datos.fecha, hora: datos.hora };
      // TODO: crear el turno (y el paciente si no existe). Si el horario ya se ocupó → errorPublico(409, …).
      throw pendiente();
    },

    async cancelar() {
      if (!real) return;
      // TODO: cancelar el turno en DrApp.
      throw pendiente();
    },

    async bloquear({ fecha, hora }) {
      if (!real) return { id: `demo-bloqueo-${fecha}-${hora}` };
      // TODO: crear un bloqueo "Ocupado (otro sistema)" sin datos de paciente → { id }.
      throw pendiente();
    },

    async desbloquear() {
      if (!real) return;
      // TODO: borrar el bloqueo. Si ya no existe, no es error.
      throw pendiente();
    },

    /**
     * Webhook de DrApp → { tipo: 'reserva' | 'cancelacion', id, fecha, hora, duracionMin } o null.
     * TODO: verificar la firma del aviso según la documentación de DrApp y mapear el cuerpo.
     */
    leerAviso() {
      if (!real) return null;
      throw pendiente();
    },
  };
}
