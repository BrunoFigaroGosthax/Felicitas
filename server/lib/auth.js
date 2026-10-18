import { configurado } from './config.js';
import { errorPublico, handler, noConfigurado } from './errores.js';
import { admin } from './supabase.js';

const leerToken = (req) => (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim() || null;

async function usuarioDelToken(token) {
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw errorPublico(401, 'Tu sesión venció. Volvé a ingresar.');
  return { id: data.user.id, email: data.user.email };
}

/** Exige sesión iniciada. Deja req.usuario = { id, email } y req.token. */
export const requiereUsuario = handler(async (req, _res, next) => {
  if (!configurado.supabase) throw noConfigurado('La cuenta de usuario');
  const token = leerToken(req);
  if (!token) throw errorPublico(401, 'Iniciá sesión para continuar.');
  req.usuario = await usuarioDelToken(token);
  req.token = token;
  next();
});

/** Sesión opcional: si hay token válido, deja req.usuario; si no, sigue como anónimo. */
export const usuarioOpcional = handler(async (req, _res, next) => {
  const token = leerToken(req);
  if (token && configurado.supabase) {
    try {
      req.usuario = await usuarioDelToken(token);
      req.token = token;
    } catch {
      /* token vencido: se trata como anónimo */
    }
  }
  next();
});
