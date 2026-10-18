// Configuración del backend. Todo sale de variables de entorno (server/.env en local, Vercel en producción).
// Cada integración funciona solo si están sus variables; si no, el backend responde 503 o usa datos de ejemplo.
const env = process.env;

export const config = {
  siteUrl: (env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  mercadoPago: {
    accessToken: env.MP_ACCESS_TOKEN,
    webhookSecret: env.MP_WEBHOOK_SECRET,
  },
  bunny: {
    streamLibraryId: env.BUNNY_STREAM_LIBRARY_ID,
    streamTokenKey: env.BUNNY_STREAM_TOKEN_KEY,
    cdnUrl: (env.BUNNY_CDN_URL || '').replace(/\/$/, ''),
    cdnTokenKey: env.BUNNY_CDN_TOKEN_KEY,
  },
  email: {
    resendKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM || 'Felicitas <no-responder@ejemplo.com>',
    admin: env.EMAIL_ADMIN,
  },
};

export const configurado = {
  supabase: Boolean(config.supabase.url && config.supabase.anonKey && config.supabase.serviceKey),
  mercadoPago: Boolean(config.mercadoPago.accessToken),
  bunny: Boolean(config.bunny.streamLibraryId && config.bunny.streamTokenKey && config.bunny.cdnUrl && config.bunny.cdnTokenKey),
  email: Boolean(config.email.resendKey),
};

if (env.VERCEL_ENV === 'production') {
  const faltan = Object.entries(configurado).filter(([, ok]) => !ok).map(([k]) => k);
  if (faltan.length) console.warn(`Integraciones sin configurar en producción: ${faltan.join(', ')}`);
  if (!configurado.mercadoPago || !config.mercadoPago.webhookSecret) {
    console.warn('MP_WEBHOOK_SECRET sin configurar: los avisos de pago no se pueden verificar.');
  }
}
