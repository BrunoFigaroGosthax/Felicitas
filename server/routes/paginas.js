// Páginas que se arman en el momento con datos de la base, para que un curso nuevo cargado
// desde el panel tenga vista previa al compartirlo y figure en el sitemap sin volver a publicar.
// En Vercel, /cursos/:slug y /sitemap.xml se reescriben a la función (vercel.json), que recibe la
// dirección original: por eso server/app.js monta estos handlers también en esas rutas.
import { Router } from 'express';
import { config, configurado } from '../lib/config.js';
import { handler } from '../lib/errores.js';
import { conMeta, PAGINAS_FIJAS, sitemap } from '../lib/meta.js';
import { admin } from '../lib/supabase.js';

const router = Router();
const IMAGEN = '/img/og.png';
let plantilla = { html: null, hasta: 0 };

/** Dirección desde la que llegó el pedido (sirve también en las versiones de prueba de Vercel). */
const origen = (req) => `${req.get('x-forwarded-proto') || req.protocol}://${req.get('x-forwarded-host') || req.get('host')}`;

/** HTML base de la app (dist/app.html, publicado junto al sitio como /app). Se guarda 10 minutos. */
async function htmlBase(req) {
  if (plantilla.html && Date.now() < plantilla.hasta) return plantilla.html;
  // En Vercel la app está en el mismo dominio; en desarrollo, el backend corre aparte (SITE_URL).
  for (const url of [`${origen(req)}/app`, `${config.siteUrl}/app`]) {
    const res = await fetch(url).catch(() => null);
    const html = res?.ok ? await res.text() : '';
    if (html.includes('id="root"')) {
      plantilla = { html, hasta: Date.now() + 10 * 60_000 };
      return html;
    }
  }
  throw new Error('No se pudo leer el HTML de la app');
}

async function cursosPublicados() {
  if (!configurado.supabase) return [];
  const { data, error } = await admin.from('cursos').select('slug, titulo, resumen, portada_imagen').eq('publicado', true).order('orden');
  if (error) throw new Error(error.message);
  return data;
}

// GET /cursos/:slug (o /api/paginas/curso?slug=…) → HTML de la app con título y vista previa del curso.
export const paginaCurso = handler(async (req, res) => {
    const slug = String(req.params.slug || req.query.slug || '');
    const html = await htmlBase(req);
    const curso = /^[a-z0-9-]{1,80}$/.test(slug) ? (await cursosPublicados()).find((c) => c.slug === slug) : null;
    res.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    if (!curso) return res.type('html').send(html); // la app muestra "no encontrada"
    res.type('html').send(
      conMeta(html, {
        titulo: `${curso.titulo} · Felicitas`,
        descripcion: curso.resumen,
        url: `${config.siteUrl}/cursos/${curso.slug}`,
        imagen: curso.portada_imagen || `${config.siteUrl}${IMAGEN}`,
      }),
    );
});

// GET /sitemap.xml (o /api/paginas/sitemap) → páginas fijas y cursos publicados.
export const paginaSitemap = handler(async (_req, res) => {
    const cursos = await cursosPublicados();
    const paginas = [
      ...PAGINAS_FIJAS.map(([ruta, , , prioridad]) => ({ ruta, prioridad })),
      ...cursos.map((c) => ({ ruta: `/cursos/${c.slug}`, prioridad: '0.8' })),
    ];
    res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.type('application/xml').send(sitemap(config.siteUrl, paginas));
});

router.get('/curso', paginaCurso);
router.get('/sitemap', paginaSitemap);

export default router;
