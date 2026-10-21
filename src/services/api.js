// Cliente HTTP mínimo hacia el backend (server/, en Vercel bajo /api). Manda el token de la sesión si hay.
import { obtenerSesion } from './auth.js';

export { USE_MOCKS, esperar } from '../lib/entorno.js';

const BASE = import.meta.env.VITE_API_URL || '';

export async function api(path, { method = 'GET', body } = {}) {
  const sesion = await obtenerSesion();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (sesion?.token) headers.Authorization = `Bearer ${sesion.token}`;

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'No pudimos completar la operación. Probá de nuevo.'), { status: res.status });
  }
  return data;
}
