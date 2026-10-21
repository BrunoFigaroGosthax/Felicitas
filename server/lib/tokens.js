// Links firmados para que el paciente cancele su turno sin cuenta: "<id del turno>.<firma>".
// La firma usa TOKEN_SECRET; si no está, una clave derivada de la service role de Supabase
// (ya es secreta y estable). Sin ninguna de las dos, una clave por proceso (solo desarrollo).
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const env = process.env;
const clave =
  env.TOKEN_SECRET ||
  (env.SUPABASE_SERVICE_ROLE_KEY ? createHash('sha256').update(`turnos:${env.SUPABASE_SERVICE_ROLE_KEY}`).digest('hex') : randomBytes(32).toString('hex'));

const firma = (id) => createHmac('sha256', clave).update(`turno:${id}`).digest('base64url');

export const tokenTurno = (id) => `${id}.${firma(id)}`;

/** Devuelve el id del turno si el token es válido; si no, null. */
export function leerTokenTurno(token) {
  const [id, f] = String(token || '').split('.');
  if (!id || !f) return null;
  const esperado = Buffer.from(firma(id));
  const recibido = Buffer.from(f);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido) ? id : null;
}
