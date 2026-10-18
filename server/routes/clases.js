import { Router } from 'express';
import { usuarioOpcional } from '../lib/auth.js';
import { urlArchivo, urlVideo } from '../lib/bunny.js';
import { configurado } from '../lib/config.js';
import { errorPublico, handler, noConfigurado } from '../lib/errores.js';
import { limite } from '../lib/limite.js';
import { admin, comoUsuario, rpc, sinError } from '../lib/supabase.js';
import { UUID } from '../lib/validar.js';

const router = Router();

// GET /api/clases/:id/medio → { video, pdf, material }: URLs firmadas de Bunny que vencen.
// Los cursos gratis y las clases de muestra se ven sin cuenta; el resto exige acceso.
router.get(
  '/:id/medio',
  limite({ ventanaMs: 60_000, maximo: 60 }),
  usuarioOpcional,
  handler(async (req, res) => {
    if (!configurado.supabase || !configurado.bunny) throw noConfigurado('El contenido de los cursos');
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

    res.set('Cache-Control', 'private, no-store');
    res.json({
      video: medios.bunny_video_id ? urlVideo(medios.bunny_video_id) : null,
      pdf: medios.pdf_ruta ? urlArchivo(medios.pdf_ruta) : null,
      material: medios.material_ruta ? urlArchivo(medios.material_ruta) : null,
    });
  }),
);

export default router;
