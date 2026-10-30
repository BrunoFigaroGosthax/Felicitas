// Reseñas de Google del consultorio (Places API "New"). La clave queda en el servidor.
// Google devuelve hasta 5 reseñas (las que considera más relevantes), la puntuación y el total.
// Se guardan en memoria 1 hora para no gastar consultas; no se guardan en la base.
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-details
import { errorPublico } from './errores.js';

const API = 'https://places.googleapis.com/v1';
const env = process.env;
const UNA_HORA = 60 * 60_000;
let cache = { datos: null, hasta: 0, lugar: env.GOOGLE_PLACE_ID || null };

export const configurado = () => Boolean(env.GOOGLE_MAPS_API_KEY);

async function llamar(ruta, { method = 'GET', campos, body } = {}) {
  const res = await fetch(`${API}${ruta}`, {
    method,
    headers: { 'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': campos, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw errorPublico(502, 'No pudimos traer las reseñas.', `Google ${ruta} → ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

/** ID del lugar: GOOGLE_PLACE_ID, o se busca una vez por nombre (GOOGLE_PLACE_QUERY). */
async function idDelLugar() {
  if (cache.lugar) return cache.lugar;
  const consulta = env.GOOGLE_PLACE_QUERY || 'Dra. Pino Meneses Felicitas, Neuquén';
  const data = await llamar('/places:searchText', { method: 'POST', campos: 'places.id,places.displayName', body: { textQuery: consulta, languageCode: 'es' } });
  const id = data.places?.[0]?.id;
  if (!id) throw errorPublico(404, 'No encontramos el consultorio en Google.', `Sin resultados para "${consulta}"`);
  cache.lugar = id;
  console.info(`Google: lugar encontrado "${data.places[0].displayName?.text}" (${id}). Para fijarlo, cargar GOOGLE_PLACE_ID=${id}`);
  return id;
}

/** Respuesta de Google → lo que muestra la página. */
export function adaptar(lugar, id) {
  return {
    disponible: true,
    puntaje: lugar.rating ?? null,
    total: lugar.userRatingCount ?? 0,
    verTodas: lugar.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${id}`,
    escribir: `https://search.google.com/local/writereview?placeid=${id}`,
    resenas: (lugar.reviews || [])
      .map((r) => ({
        autor: r.authorAttribution?.displayName || 'Usuario de Google',
        autorUrl: r.authorAttribution?.uri || null,
        estrellas: r.rating ?? null,
        texto: (r.text?.text || r.originalText?.text || '').trim(),
        cuando: r.relativePublishTimeDescription || '',
        url: r.googleMapsUri || null,
      }))
      .filter((r) => r.texto),
  };
}

export async function resenasGoogle() {
  if (!configurado()) return { disponible: false };
  if (cache.datos && Date.now() < cache.hasta) return cache.datos;
  const id = await idDelLugar();
  const lugar = await llamar(`/places/${encodeURIComponent(id)}?languageCode=es`, { campos: 'rating,userRatingCount,reviews,googleMapsUri' });
  cache = { ...cache, datos: adaptar(lugar, id), hasta: Date.now() + UNA_HORA };
  return cache.datos;
}
