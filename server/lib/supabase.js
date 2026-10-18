import { createClient } from '@supabase/supabase-js';
import { config, configurado } from './config.js';
import { errorPublico } from './errores.js';

const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

/** Cliente con service role: saltea RLS. Solo para lo que el usuario no puede hacer por sí mismo. */
export const admin = configurado.supabase
  ? createClient(config.supabase.url, config.supabase.serviceKey, opciones)
  : null;

/** Cliente que actúa como el usuario del token (o como anónimo sin token): respeta RLS y auth.uid(). */
export function comoUsuario(token) {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    ...opciones,
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

/**
 * Llama a una función de la base. Los `raise exception` de las funciones (código P0001) traen
 * mensajes pensados para el usuario ("Ya usaste este código."): se devuelven tal cual con 400.
 */
export async function rpc(cliente, funcion, args) {
  const { data, error } = await cliente.rpc(funcion, args);
  if (error) {
    if (error.code === 'P0001') throw errorPublico(400, error.message);
    throw new Error(`Supabase ${funcion}: ${error.message}`);
  }
  return data;
}

/** Igual que rpc pero para consultas: lanza si hay error. */
export function sinError({ data, error }, que) {
  if (error) throw new Error(`Supabase ${que}: ${error.message}`);
  return data;
}
