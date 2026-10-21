// Título, descripción y etiquetas Open Graph de una página (lo que leen Google, WhatsApp e Instagram).
// Lo usan el prerender del build y la página dinámica de cursos (server/routes/paginas.js).

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inserta título, descripción, canonical y Open Graph en el HTML base de la app. */
export function conMeta(html, { titulo, descripcion, url, imagen }) {
  const meta = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Felicitas" />`,
    `<meta property="og:locale" content="es_AR" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descripcion)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(imagen)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(descripcion)}" />`)
    .replace('</head>', `    ${meta}\n  </head>`);
}

/** Páginas públicas fijas: [ruta, título, descripción, prioridad en el sitemap]. */
export const PAGINAS_FIJAS = [
  ['/', 'Felicitas · Pediatría con propósito', 'Dra. Felicitas Pino, pediatra. Turnos online y cursos para familias.', '1.0'],
  ['/turnos', 'Pedí tu turno · Felicitas', 'Elegí día y horario para la consulta pediátrica. Te llega la confirmación por email.', '0.9'],
  ['/cursos', 'Cursos · Felicitas', 'Guías en PDF y clases en video para el día a día con tus hijos. Algunas son gratuitas.', '0.9'],
  ['/arrepentimiento', 'Botón de arrepentimiento · Felicitas', 'Revocá una compra dentro de los 10 días corridos.', '0.3'],
  ['/terminos', 'Términos y condiciones · Felicitas', 'Condiciones de uso del sitio, turnos y cursos.', '0.2'],
  ['/privacidad', 'Política de privacidad · Felicitas', 'Cómo cuidamos tus datos personales.', '0.2'],
];

export function sitemap(sitio, paginas) {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paginas.map((p) => `  <url><loc>${esc(sitio + p.ruta)}</loc><lastmod>${hoy}</lastmod><priority>${p.prioridad}</priority></url>`).join('\n') +
    '\n</urlset>\n'
  );
}
