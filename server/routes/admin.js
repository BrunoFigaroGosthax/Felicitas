// Panel de administración: solo lo que necesita secretos del servidor (la API de Bunny).
// Todo lo demás (cursos, cupones, PDF…) lo hace el panel directo contra Supabase con la sesión
// del admin, protegido por las políticas RLS de es_admin().
import { Router } from 'express';
import { requiereUsuario } from '../lib/auth.js';
import { borrarVideo, crearVideo, estadoVideo, firmaSubida } from '../lib/bunny.js';
import { configurado } from '../lib/config.js';
import { errorPublico, handler, noConfigurado } from '../lib/errores.js';
import { admin, sinError } from '../lib/supabase.js';
import { UUID } from '../lib/validar.js';

const router = Router();

const requiereAdmin = [
  requiereUsuario,
  handler(async (req, _res, next) => {
    const perfil = sinError(await admin.from('perfiles').select('rol').eq('id', req.usuario.id).single(), 'perfiles');
    if (perfil.rol !== 'admin') throw errorPublico(403, 'Solo para administradores.');
    next();
  }),
];

const conBunny = (_req, _res, next) => next(configurado.bunny ? undefined : noConfigurado('La subida de videos'));

async function leerClase(claseId) {
  if (!UUID.test(claseId || '')) throw errorPublico(400, 'Clase inválida.');
  const clase = sinError(
    await admin
      .from('clases')
      .select('id, titulo, tipo, cursos (titulo), clases_medios (bunny_video_id)')
      .eq('id', claseId)
      .maybeSingle(),
    'clases',
  );
  if (!clase) throw errorPublico(404, 'No encontramos la clase.');
  const medios = Array.isArray(clase.clases_medios) ? clase.clases_medios[0] : clase.clases_medios;
  return { ...clase, videoActual: medios?.bunny_video_id || null };
}

router.use(requiereAdmin);

// POST /api/admin/videos { claseId } → firma para subir el archivo directo a Bunny por TUS.
// El video queda asociado a la clase recién cuando se confirma la subida.
router.post(
  '/videos',
  conBunny,
  handler(async (req, res) => {
    const clase = await leerClase(req.body?.claseId);
    const videoId = await crearVideo(`${clase.cursos?.titulo || 'Curso'} · ${clase.titulo}`);
    res.status(201).json(firmaSubida(videoId));
  }),
);

// POST /api/admin/videos/confirmar { claseId, videoId } → asocia el video y borra el anterior de Bunny.
router.post(
  '/videos/confirmar',
  conBunny,
  handler(async (req, res) => {
    const clase = await leerClase(req.body?.claseId);
    const videoId = String(req.body?.videoId || '');
    if (!UUID.test(videoId)) throw errorPublico(400, 'Video inválido.');
    sinError(
      await admin.from('clases_medios').upsert({ clase_id: clase.id, bunny_video_id: videoId }, { onConflict: 'clase_id' }),
      'clases_medios',
    );
    if (clase.videoActual && clase.videoActual !== videoId) {
      await borrarVideo(clase.videoActual).catch((e) => console.error('No se pudo borrar el video anterior:', e.message));
    }
    res.json({ ok: true });
  }),
);

// GET /api/admin/videos/:claseId → { estado, duracionS }. Al quedar listo, guarda la duración en la clase.
router.get(
  '/videos/:claseId',
  conBunny,
  handler(async (req, res) => {
    const clase = await leerClase(req.params.claseId);
    if (!clase.videoActual) return res.json({ estado: 'sin-video', duracionS: null });
    const estado = await estadoVideo(clase.videoActual);
    if (estado.estado === 'listo' && estado.duracionS) {
      sinError(await admin.from('clases').update({ duracion_segundos: estado.duracionS }).eq('id', clase.id), 'clases');
    }
    res.json(estado);
  }),
);

// DELETE /api/admin/videos/:claseId → quita el video de la clase y lo borra de Bunny.
router.delete(
  '/videos/:claseId',
  conBunny,
  handler(async (req, res) => {
    const clase = await leerClase(req.params.claseId);
    if (clase.videoActual) {
      sinError(await admin.from('clases_medios').update({ bunny_video_id: null }).eq('clase_id', clase.id), 'clases_medios');
      await borrarVideo(clase.videoActual);
    }
    res.json({ ok: true });
  }),
);

export default router;
