// Modo mantenimiento (tabla `ajustes`). La web muestra el aviso; acá se frenan reservas y compras
// por si alguien tenía la página abierta de antes. Cancelar turnos, arrepentimiento, webhooks y crons siguen.
import { leerAjustes } from './ajustes.js';
import { errorPublico, handler } from './errores.js';

// Si no se puede leer (por ejemplo, migración sin correr), el sitio sigue abierto.
export const enMantenimiento = async () => Boolean((await leerAjustes()).mantenimiento);

export const cerradoEnMantenimiento = handler(async (_req, _res, next) => {
  if (await enMantenimiento()) throw errorPublico(503, 'Estamos haciendo unos ajustes en la página. Probá de nuevo en un rato.');
  next();
});
