// Bunny Stream: videos de los cursos.
// - Reproducción: URL del reproductor firmada que vence ("Token Authentication" activado en la biblioteca).
// - Subida (panel admin): el navegador sube directo a Bunny por TUS con una firma que da el backend,
//   así los videos no pasan por Vercel (que limita el tamaño de los pedidos).
// Docs: https://docs.bunny.net/reference/tus-resumable-uploads
import { createHash } from 'node:crypto';
import { config } from './config.js';
import { errorPublico } from './errores.js';

const ahoraS = () => Math.floor(Date.now() / 1000);
const API = 'https://video.bunnycdn.com';
export const TUS_ENDPOINT = `${API}/tusupload`;

/** URL del reproductor embebido: token = SHA256_hex(clave + videoId + vence). */
export function urlVideo(videoId, { duracionS = 4 * 3600, clave = config.bunny.streamTokenKey, biblioteca = config.bunny.streamLibraryId } = {}) {
  const vence = ahoraS() + duracionS;
  const token = createHash('sha256').update(`${clave}${videoId}${vence}`).digest('hex');
  return `https://iframe.mediadelivery.net/embed/${biblioteca}/${videoId}?token=${token}&expires=${vence}`;
}

/** Firma para subir por TUS: SHA256_hex(biblioteca + apiKey + vence + videoId). */
export function firmaSubida(videoId, { duracionS = 6 * 3600, biblioteca = config.bunny.streamLibraryId, apiKey = config.bunny.streamApiKey } = {}) {
  const vence = ahoraS() + duracionS;
  const firma = createHash('sha256').update(`${biblioteca}${apiKey}${vence}${videoId}`).digest('hex');
  return { firma, vence, biblioteca, videoId, endpoint: TUS_ENDPOINT };
}

async function llamar(ruta, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}/library/${config.bunny.streamLibraryId}${ruta}`, {
    method,
    headers: { AccessKey: config.bunny.streamApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(method === 'DELETE' && res.status === 404)) {
    throw errorPublico(502, 'No pudimos conectar con Bunny. Probá de nuevo en unos minutos.', `Bunny ${method} ${ruta} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/** Crea el video vacío en la biblioteca y devuelve su id (guid). */
export async function crearVideo(titulo) {
  const data = await llamar('/videos', { method: 'POST', body: { title: titulo.slice(0, 200) } });
  return data.guid;
}

export const borrarVideo = (videoId) => llamar(`/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });

/** Estado del video: { estado: 'subiendo' | 'procesando' | 'listo' | 'error', duracionS }. */
export async function estadoVideo(videoId) {
  const v = await llamar(`/videos/${encodeURIComponent(videoId)}`);
  return { estado: estadoDesdeBunny(v.status), duracionS: v.length || null };
}

// Bunny: 0 creado, 1 subido, 2 procesando, 3 transcodificando, 4 terminado, 5 error, 6 falló la subida.
export function estadoDesdeBunny(status) {
  if (status === 4) return 'listo';
  if (status === 5 || status === 6) return 'error';
  if (status === 0) return 'subiendo';
  return 'procesando';
}
