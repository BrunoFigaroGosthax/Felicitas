// Corre después de `vite build`. WhatsApp, Instagram y otros no ejecutan JavaScript al armar la vista
// previa de un link: por eso se genera un HTML por página pública fija con su título, descripción y
// etiquetas Open Graph, más robots.txt.
//
// - dist/app.html: copia sin datos de página, para las rutas privadas o desconocidas (ver vercel.json).
// - Las páginas de cada curso y el sitemap se arman en el momento con los datos de la base
//   (server/routes/paginas.js), así un curso nuevo cargado desde el panel no necesita volver a publicar.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conMeta, PAGINAS_FIJAS } from '../server/lib/meta.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const env = process.env;

const SITIO = (
  env.SITE_URL ||
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:4173')
).replace(/\/$/, '');
if (!env.SITE_URL) console.warn(`prerender: SITE_URL sin definir, se usa ${SITIO}`);

const IMAGEN = existsSync(join(dist, 'img', 'og.png')) ? '/img/og.png' : '/img/logo-principal.png';

const base = readFileSync(join(dist, 'index.html'), 'utf8');
writeFileSync(join(dist, 'app.html'), base);

for (const [ruta, titulo, descripcion] of PAGINAS_FIJAS) {
  const html = conMeta(base, { titulo, descripcion, url: `${SITIO}${ruta}`, imagen: `${SITIO}${IMAGEN}` });
  const archivo = ruta === '/' ? join(dist, 'index.html') : join(dist, `${ruta.slice(1)}.html`);
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(archivo, html);
}

writeFileSync(
  join(dist, 'robots.txt'),
  ['User-agent: *', 'Disallow: /api/', 'Disallow: /admin', 'Disallow: /mi-cuenta', 'Disallow: /nueva-clave', 'Disallow: /pago/', 'Disallow: /turnos/cancelar', '', `Sitemap: ${SITIO}/sitemap.xml`, ''].join('\n'),
);

console.log(`prerender: ${PAGINAS_FIJAS.length} páginas fijas y robots.txt (${SITIO})`);
