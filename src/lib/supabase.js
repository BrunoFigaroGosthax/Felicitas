// Cliente de Supabase del navegador (clave anon: solo puede lo que permiten las políticas RLS).
// null en modo demo o sin variables: los servicios usan entonces datos de ejemplo.
import { createClient } from '@supabase/supabase-js';
import { USE_MOCKS } from './entorno.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = !USE_MOCKS && url && clave ? createClient(url, clave) : null;
