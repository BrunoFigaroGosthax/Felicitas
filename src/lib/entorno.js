// true = la web funciona sola, con datos de ejemplo y una sesión de prueba (sin backend ni Supabase).
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
