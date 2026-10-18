// Bunny: URLs firmadas que vencen, para que los videos y PDF pagos no queden con link público.
// - Videos (Bunny Stream): activar "Token Authentication" en la biblioteca.
// - PDF (Storage + Pull Zone): activar "Token Authentication" en la pull zone.
import { createHash } from 'node:crypto';
import { config } from './config.js';

const ahoraS = () => Math.floor(Date.now() / 1000);

/** URL del reproductor embebido de Bunny Stream: token = SHA256_hex(clave + videoId + vence). */
export function urlVideo(videoId, { duracionS = 4 * 3600, clave = config.bunny.streamTokenKey, biblioteca = config.bunny.streamLibraryId } = {}) {
  const vence = ahoraS() + duracionS;
  const token = createHash('sha256').update(`${clave}${videoId}${vence}`).digest('hex');
  return `https://iframe.mediadelivery.net/embed/${biblioteca}/${videoId}?token=${token}&expires=${vence}`;
}

/**
 * URL firmada de un archivo en la CDN: token = base64url(SHA256(clave + ruta + vence)).
 * Las rutas se guardan sin espacios ni acentos (ej.: cursos/fiebre/guia.pdf).
 */
export function urlArchivo(ruta, { duracionS = 15 * 60, clave = config.bunny.cdnTokenKey, cdn = config.bunny.cdnUrl } = {}) {
  const path = `/${ruta.replace(/^\/+/, '')}`;
  const vence = ahoraS() + duracionS;
  const token = createHash('sha256').update(`${clave}${path}${vence}`).digest('base64url');
  return `${cdn}${path}?token=${token}&expires=${vence}`;
}
