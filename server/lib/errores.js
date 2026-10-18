/** Error con un mensaje apto para mostrar al usuario. */
export function errorPublico(status, mensaje, detalle) {
  return Object.assign(new Error(detalle || mensaje), { status, publicMessage: mensaje });
}

export const noConfigurado = (que) =>
  errorPublico(503, `${que} no está disponible en este momento. Probá más tarde o escribinos por WhatsApp.`);

/** Envuelve un handler async para que los errores lleguen al manejador de Express. */
export const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
