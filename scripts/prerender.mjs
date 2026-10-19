// Corre después de `vite build`. WhatsApp, Instagram y otros no ejecutan JavaScript al armar la vista
// previa de un link: por eso se genera un HTML por página pública con su título, descripción y
// etiquetas Open Graph. También sitemap.xml y robots.txt.
//
// - dist/app.html: copia sin datos de página, para las rutas privadas o desconocidas (ver vercel.json).
// - Cursos: de Supabase si hay VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY; si no, de src/data/cursos.js.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURSOS } from '../src/data/cursos.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const env = process.env;

const SITIO = (
  env.SITE_URL ||
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4173')
).replace(/\/$/, '');
if (!env.SITE_URL) console.warn(`prerender: SITE_URL sin definir, se usa ${SITIO}`);

const IMAGEN = existsSync(join(dist, 'img', 'og.png')) ? '/img/og.png' : '/img/logo-principal.png';
const MARCA = 'Felicitas · Pediatría con propósito';

async function cursos() {
  const url = env.VITE_SUPABASE_URL;
  const clave = env.VITE_SUPABASE_ANON_KEY;
  if (env.VITE_USE_MOCKS === 'false' && url && clave) {
    const res = await fetch(`${url}/rest/v1/cursos?select=slug,titulo,resumen&publicado=eq.true&order=orden`, {
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
    });
    if (!res.ok) throw new Error(`prerender: no se pudieron leer los cursos de Supabase (${res.status})`);
    return res.json();
  }
  return CURSOS;
}

const paginas = [
  { ruta: '/', titulo: MARCA, descripcion: 'Dra. Felicitas Pino, pediatra. Turnos online y cursos para familias.', prioridad: '1.0' },
  { ruta: '/turnos', titulo: 'Pedí tu turno · Felicitas', descripcion: 'Elegí día y horario para la consulta pediátrica. Te llega la confirmación por email.', prioridad: '0.9' },
  { ruta: '/cursos', titulo: 'Cursos · Felicitas', descripcion: 'Guías en PDF y clases en video para el día a día con tus hijos. Algunas son gratuitas.', prioridad: '0.9' },
  ...(await cursos()).map((c) => ({ ruta: `/cursos/${c.slug}`, titulo: `${c.titulo} · Felicitas`, descripcion: c.resumen, prioridad: '0.8' })),
  { ruta: '/arrepentimiento', titulo: 'Botón de arrepentimiento · Felicitas', descripcion: 'Revocá una compra dentro de los 10 días corridos.', prioridad: '0.3' },
  { ruta: '/terminos', titulo: 'Términos y condiciones · Felicitas', descripcion: 'Condiciones de uso del sitio, turnos y cursos.', prioridad: '0.2' },
  { ruta: '/privacidad', titulo: 'Política de privacidad · Felicitas', descripcion: 'Cómo cuidamos tus datos personales.', prioridad: '0.2' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const base = readFileSync(join(dist, 'index.html'), 'utf8');
writeFileSync(join(dist, 'app.html'), base);

for (const p of paginas) {
  const url = `${SITIO}${p.ruta === '/' ? '/' : p.ruta}`;
  const meta = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Felicitas" />`,
    `<meta property="og:locale" content="es_AR" />`,
    `<meta property="og:title" content="${esc(p.titulo)}" />`,
    `<meta property="og:description" content="${esc(p.descripcion)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(SITIO + IMAGEN)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');

  const html = base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(p.titulo)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(p.descripcion)}" />`)
    .replace('</head>', `    ${meta}\n  </head>`);

  const archivo = p.ruta === '/' ? join(dist, 'index.html') : join(dist, `${p.ruta.slice(1)}.html`);
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(archivo, html);
}

const hoy = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paginas
      .map((p) => `  <url><loc>${esc(SITIO + p.ruta)}</loc><lastmod>${hoy}</lastmod><priority>${p.prioridad}</priority></url>`)
      .join('\n') +
    '\n</urlset>\n',
);

writeFileSync(
  join(dist, 'robots.txt'),
  ['User-agent: *', 'Disallow: /api/', 'Disallow: /admin', 'Disallow: /mi-cuenta', 'Disallow: /nueva-clave', 'Disallow: /pago/', '', `Sitemap: ${SITIO}/sitemap.xml`, ''].join('\n'),
);

console.log(`prerender: ${paginas.length} páginas, sitemap.xml y robots.txt (${SITIO})`);
