import { Router } from 'express';
import { usuarioOpcional } from '../lib/auth.js';
import { urlVideo } from '../lib/bunny.js';
import { configurado } from '../lib/config.js';
import { errorPublico, handler, noConfigurado } from '../lib/errores.js';
import { limite } from '../lib/limite.js';
import { admin, comoUsuario, rpc, sinError } from '../lib/supabase.js';
import { UUID } from '../lib/validar.js';

const router = Router();
export const BUCKET_MATERIALES = 'materiales';

/** Link firmado a un PDF del bucket privado, válido unos minutos. */
async function urlPdf(ruta) {
  const { data, error } = await admin.storage.from(BUCKET_MATERIALES).createSignedUrl(ruta, 15 * 60);
  if (error) {
    console.error(`No se pudo firmar ${ruta}: ${error.message}`);
    return null;
  }
  return data.signedUrl;
}

// GET /api/clases/:id/medio → { video, pdf, material }: links que vencen.
// Videos en Bunny Stream; PDF en Supabase Storage. Cursos gratis y clases de muestra se ven sin cuenta.
router.get(
  '/:id/medio',
  limite({ ventanaMs: 60_000, maximo: 60 }),
  usuarioOpcional,
  handler(async (req, res) => {
    if (!configurado.supabase) throw noConfigurado('El contenido de los cursos');
    const { id } = req.params;
    if (!UUID.test(id)) throw errorPublico(404, 'No encontramos la clase.');

    // Se pregunta como el usuario (auth.uid()), no con la service role.
    const puede = await rpc(comoUsuario(req.token), 'puede_ver_clase', { p_clase_id: id });
    if (!puede) {
      throw errorPublico(req.usuario ? 403 : 401, req.usuario ? 'Esta clase es parte del curso pago.' : 'Iniciá sesión para ver esta clase.');
    }

    const clase = sinError(
      await admin.from('clases').select('tipo, clases_medios (bunny_video_id, pdf_ruta, material_ruta)').eq('id', id).single(),
      'clases',
    );
    const medios = (Array.isArray(clase.clases_medios) ? clase.clases_medios[0] : clase.clases_medios) || {};
    if (medios.bunny_video_id && !configurado.bunny) throw noConfigurado('El video');

    const [pdf, material] = await Promise.all([
      medios.pdf_ruta ? urlPdf(medios.pdf_ruta) : null,
      medios.material_ruta ? urlPdf(medios.material_ruta) : null,
    ]);

    res.set('Cache-Control', 'private, no-store');
    res.json({ video: medios.bunny_video_id ? urlVideo(medios.bunny_video_id) : null, pdf, material });
  }),
);

export default router;
