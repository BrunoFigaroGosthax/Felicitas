// Cuenta de usuario (Supabase Auth). Sin Supabase, una sesión de prueba en el navegador:
// cualquier email y contraseña funcionan, para poder recorrer la web completa.
import { supabase } from '../lib/supabase.js';
import { esperar } from '../lib/entorno.js';
import { TERMINOS_VERSION } from '../data/legal.js';

const CLAVE_SESION = 'felicitas:demo-sesion';
const CLAVE_PERFIL = 'felicitas:demo-perfil';
const oyentes = new Set();

function leer(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave));
  } catch {
    return null;
  }
}
function guardar(clave, valor) {
  try {
    if (valor == null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: la sesión de prueba dura lo que la pestaña */
  }
}
function cambiarSesionDemo(sesion) {
  guardar(CLAVE_SESION, sesion);
  oyentes.forEach((cb) => cb(sesion));
}

const MENSAJES = [
  [/invalid login credentials/i, 'El email o la contraseña no son correctos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu email. Revisá tu casilla (y el correo no deseado).'],
  [/already registered/i, 'Ya hay una cuenta con ese email. Probá ingresar o recuperar la contraseña.'],
  [/password should be|weak password/i, 'La contraseña tiene que tener al menos 8 caracteres.'],
  [/should be different|same password/i, 'La contraseña nueva tiene que ser distinta de la anterior.'],
  [/rate limit|too many/i, 'Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.'],
  [/session|jwt|not authenticated/i, 'Tu sesión venció. Volvé a ingresar.'],
];
function traducir(error) {
  const m = MENSAJES.find(([re]) => re.test(error?.message || ''));
  return new Error(m ? m[1] : 'No pudimos completar la operación. Probá de nuevo.');
}

const aSesion = (s) => (s ? { usuario: { id: s.user.id, email: s.user.email }, token: s.access_token } : null);

/** { usuario: { id, email }, token } o null. */
export async function obtenerSesion() {
  if (!supabase) return leer(CLAVE_SESION);
  const { data } = await supabase.auth.getSession();
  return aSesion(data.session);
}

/** Avisa cada cambio de sesión (ingreso, salida, token renovado). Devuelve la función para dejar de escuchar. */
export function escucharSesion(cb) {
  if (!supabase) {
    oyentes.add(cb);
    return () => oyentes.delete(cb);
  }
  const { data } = supabase.auth.onAuthStateChange((_evento, s) => cb(aSesion(s)));
  return () => data.subscription.unsubscribe();
}

/** Devuelve { confirmarEmail } : true si hay que confirmar el email antes de ingresar. */
export async function registrarse({ nombre, email, clave }) {
  if (!supabase) {
    await esperar(400);
    guardar(CLAVE_PERFIL, { nombre, telefono: '' });
    cambiarSesionDemo({ usuario: { id: 'demo', email }, token: 'demo' });
    return { confirmarEmail: false };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password: clave,
    options: {
      data: { nombre, acepto_terminos_version: TERMINOS_VERSION },
      emailRedirectTo: `${window.location.origin}/mi-cuenta`,
    },
  });
  if (error) throw traducir(error);
  return { confirmarEmail: !data.session };
}

export async function ingresar({ email, clave }) {
  if (!supabase) {
    await esperar(400);
    if (!leer(CLAVE_PERFIL)) guardar(CLAVE_PERFIL, { nombre: '', telefono: '' });
    cambiarSesionDemo({ usuario: { id: 'demo', email }, token: 'demo' });
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
  if (error) throw traducir(error);
}

export async function salir() {
  if (!supabase) return cambiarSesionDemo(null);
  await supabase.auth.signOut();
}

export async function recuperarClave(email) {
  if (!supabase) return esperar(400);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/nueva-clave`,
  });
  if (error) throw traducir(error);
}

export async function cambiarClave(clave) {
  if (!supabase) return esperar(400);
  const { error } = await supabase.auth.updateUser({ password: clave });
  if (error) throw traducir(error);
}

/** { nombre, telefono } del usuario actual. */
export async function obtenerPerfil() {
  if (!supabase) return leer(CLAVE_PERFIL) || { nombre: '', telefono: '' };
  const sesion = await obtenerSesion();
  const { data, error } = await supabase.from('perfiles').select('nombre, telefono').eq('id', sesion.usuario.id).single();
  if (error) throw traducir(error);
  return { nombre: data.nombre || '', telefono: data.telefono || '' };
}

export async function actualizarPerfil({ nombre, telefono }) {
  const datos = { nombre: nombre.trim() || null, telefono: telefono.trim() || null };
  if (!supabase) {
    await esperar(300);
    return guardar(CLAVE_PERFIL, { nombre: datos.nombre || '', telefono: datos.telefono || '' });
  }
  const sesion = await obtenerSesion();
  const { error } = await supabase.from('perfiles').update(datos).eq('id', sesion.usuario.id);
  if (error) throw traducir(error);
}

export const modoDemo = !supabase;
