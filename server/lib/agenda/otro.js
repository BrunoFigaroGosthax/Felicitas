/**
 * Adaptador del segundo sistema de turnos que usa la doctora.
 *
 * PENDIENTE: saber cuál es y si tiene API, webhooks o sincronización con Google Calendar.
 * Mientras OTRO_SISTEMA_API_URL no esté configurada, este sistema no participa de la agenda.
 * Al implementarlo: completar cada método según el contrato de ./nucleo.js, renombrar `id` y
 * `nombre`, y agregar sus variables a server/.env.example. Si solo ofrece Google Calendar,
 * este adaptador puede leer y escribir ese calendario en su lugar.
 */
import { errorPublico } from '../errores.js';

const pendiente = () => errorPublico(501, 'La agenda no está disponible en este momento.', 'Integración con el segundo sistema sin implementar');

export function crearOtroSistema(env = process.env) {
  return {
    id: 'otro',
    nombre: 'Otro sistema',
    principal: false,
    real: Boolean(env.OTRO_SISTEMA_API_URL),
    horarios: async () => { throw pendiente(); },
    ocupados: async () => { throw pendiente(); },
    turnos: async () => { throw pendiente(); },
    reservar: async () => { throw pendiente(); },
    cancelar: async () => { throw pendiente(); },
    bloquear: async () => { throw pendiente(); },
    desbloquear: async () => { throw pendiente(); },
    leerAviso: () => { throw pendiente(); },
  };
}
