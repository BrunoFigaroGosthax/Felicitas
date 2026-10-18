/**
 * Adaptador con DrApp.
 *
 * PENDIENTE: completar con la documentación de la API de DrApp (endpoints, autenticación,
 * formato de agenda y de reserva). Las credenciales van SOLO en server/.env, nunca en el frontend.
 *
 * Mientras DRAPP_API_KEY no esté configurada, devuelve datos de ejemplo para poder desarrollar.
 */
const { DRAPP_API_URL, DRAPP_API_KEY } = process.env;
const configurado = Boolean(DRAPP_API_URL && DRAPP_API_KEY);

const HORARIOS = ['09:00', '09:30', '10:00', '10:30', '11:00', '16:00', '16:30', '17:00'];

export async function disponibilidad(fecha) {
  if (!configurado) {
    const semilla = Number(fecha.slice(-2));
    return HORARIOS.map((hora, i) => ({ hora, disponible: (i + semilla) % 4 !== 0 }));
  }
  // TODO: llamar al endpoint de agenda de DrApp y mapear la respuesta a [{ hora, disponible }].
  throw Object.assign(new Error('Integración con DrApp sin implementar'), {
    status: 501,
    publicMessage: 'La agenda online no está disponible en este momento.',
  });
}

export async function crearTurno(datos) {
  if (!configurado) {
    return { id: `demo-${Date.now()}`, fecha: datos.fecha, hora: datos.hora };
  }
  // TODO: crear el turno en DrApp (y el paciente si no existe). Devolver { id, fecha, hora }.
  // Considerar: el horario puede ocuparse entre la consulta y la reserva → responder 409 con mensaje claro.
  throw Object.assign(new Error('Integración con DrApp sin implementar'), {
    status: 501,
    publicMessage: 'No pudimos reservar el turno online. Escribinos por WhatsApp.',
  });
}
