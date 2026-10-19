// Panel de administración. Habla directo con Supabase con la sesión del admin (las políticas RLS
// verifican es_admin()). Solo los videos pasan por el backend, que tiene la clave de Bunny.
import { supabase } from '../lib/supabase.js';
import { api } from './api.js';

const BUCKET = 'materiales';
const MAX_PDF = 50 * 1024 * 1024;

function mensaje(error, porDefecto) {
  if (error.code === '23505') return 'Ya existe uno con ese nombre, dirección o código.';
  if (error.code === '23503') return 'No se puede borrar porque tiene datos asociados (por ejemplo, ventas).';
  if (error.code === '23514') return 'Revisá los datos: alguno no tiene un valor válido.';
  if (error.code === '42501') return 'No tenés permiso para hacer esto.';
  if (error.code === 'P0001') return error.message;
  return porDefecto;
}

function db() {
  if (!supabase) throw new Error('El panel necesita Supabase conectado (VITE_USE_MOCKS=false).');
  return supabase;
}

/** Ejecuta una consulta de Supabase y devuelve data, o lanza un error con mensaje claro. */
async function q(consulta, porDefecto = 'No pudimos completar la operación. Probá de nuevo.') {
  const { data, error } = await consulta;
  if (error) {
    console.error(error);
    throw new Error(mensaje(error, porDefecto));
  }
  return data;
}

/** "Mi hijo tiene fiebre, ¿qué hago?" → "mi-hijo-tiene-fiebre-que-hago" */
export const aSlug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// Diseño de portada según el color elegido (las ondas del manual de marca).
export const ONDAS_POR_FONDO = {
  amarillo: [{ trazo: 'a', color: 'menta' }, { trazo: 'd', color: 'lavanda' }],
  menta: [{ trazo: 'b', color: 'amarillo' }],
  lavanda: [{ trazo: 'c', color: 'amarillo' }],
};

// ---------------- Cursos ----------------

export async function listarCursosAdmin() {
  const [cursos, ventas] = await Promise.all([
    q(db().from('cursos').select('*, clases (id)').order('orden'), 'No pudimos cargar los cursos.'),
    q(db().rpc('admin_resumen_ventas'), 'No pudimos cargar las ventas.'),
  ]);
  const porCurso = new Map(ventas.map((v) => [v.curso_id, v]));
  return cursos.map((c) => ({ ...c, vendidas: Number(porCurso.get(c.id)?.vendidas || 0), recaudado: Number(porCurso.get(c.id)?.recaudado || 0) }));
}

export async function obtenerCursoAdmin(id) {
  const curso = await q(
    db().from('cursos').select('*, clases (*, clases_medios (bunny_video_id, pdf_ruta, material_ruta))').eq('id', id).maybeSingle(),
    'No pudimos cargar el curso.',
  );
  if (!curso) return null;
  curso.clases = [...curso.clases]
    .sort((a, b) => a.orden - b.orden)
    .map((c) => ({ ...c, medios: (Array.isArray(c.clases_medios) ? c.clases_medios[0] : c.clases_medios) || {} }));
  return curso;
}

/** Crea (sin id) o actualiza un curso. Devuelve el curso guardado. */
export async function guardarCurso(datos, id) {
  const fila = {
    titulo: datos.titulo.trim(),
    slug: datos.slug.trim(),
    resumen: datos.resumen.trim(),
    descripcion: datos.descripcion?.trim() || null,
    formato: datos.formato,
    precio: Number(datos.precio) || 0,
    portada_fondo: datos.portada_fondo,
    portada_ondas: ONDAS_POR_FONDO[datos.portada_fondo],
    destacado: datos.destacado,
    publicado: datos.publicado,
    otorga_certificado: datos.otorga_certificado,
    orden: Number(datos.orden) || 0,
  };
  const consulta = id ? db().from('cursos').update(fila).eq('id', id) : db().from('cursos').insert(fila);
  return q(consulta.select().single(), 'No pudimos guardar el curso.');
}

/** Borra un curso sin ventas, con sus clases, PDF y videos. Con ventas, hay que despublicarlo. */
export async function borrarCurso(id) {
  const { count } = await db().from('compras').select('id', { count: 'exact', head: true }).eq('curso_id', id);
  if (count > 0) throw new Error('Este curso tiene ventas: no se puede borrar. Despublicalo para que deje de verse.');
  const curso = await obtenerCursoAdmin(id);
  for (const clase of curso?.clases || []) await limpiarMediosClase(clase);
  await q(db().from('cursos').delete().eq('id', id), 'No pudimos borrar el curso.');
}

// ---------------- Clases ----------------

export async function crearClase(curso, datos) {
  const orden = Math.max(0, ...curso.clases.map((c) => c.orden)) + 1;
  const base = aSlug(datos.titulo) || 'clase';
  const usados = new Set(curso.clases.map((c) => c.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  const clase = await q(
    db()
      .from('clases')
      .insert({ curso_id: curso.id, slug, titulo: datos.titulo.trim(), tipo: datos.tipo, orden, muestra: Boolean(datos.muestra) })
      .select()
      .single(),
    'No pudimos crear la clase.',
  );
  await q(db().from('clases_medios').insert({ clase_id: clase.id }), 'No pudimos crear la clase.');
  return clase;
}

export async function guardarClase(id, datos) {
  return q(
    db()
      .from('clases')
      .update({
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion?.trim() || null,
        tipo: datos.tipo,
        muestra: Boolean(datos.muestra),
        publicada: Boolean(datos.publicada),
        duracion_segundos: datos.duracionMin ? Math.round(Number(datos.duracionMin) * 60) : null,
      })
      .eq('id', id),
    'No pudimos guardar la clase.',
  );
}

export const moverClase = (id, direccion) => q(db().rpc('admin_mover_clase', { p_clase_id: id, p_direccion: direccion }), 'No pudimos mover la clase.');

async function limpiarMediosClase(clase) {
  const rutas = [clase.medios?.pdf_ruta, clase.medios?.material_ruta].filter(Boolean);
  if (rutas.length) await db().storage.from(BUCKET).remove(rutas);
  if (clase.medios?.bunny_video_id) await api(`/admin/videos/${clase.id}`, { method: 'DELETE' });
}

export async function borrarClase(clase) {
  await limpiarMediosClase(clase);
  await q(db().from('clases').delete().eq('id', clase.id), 'No pudimos borrar la clase.');
}

// ---------------- PDF (Supabase Storage) ----------------

/** campo: 'pdf_ruta' (la clase es un PDF) o 'material_ruta' (PDF de apoyo de un video). */
export async function subirPdf(curso, clase, archivo, campo) {
  if (archivo.type !== 'application/pdf') throw new Error('El archivo tiene que ser un PDF.');
  if (archivo.size > MAX_PDF) throw new Error('El PDF pesa más de 50 MB. Comprimilo antes de subirlo.');
  const ruta = `cursos/${curso.slug}/${clase.id}-${campo === 'pdf_ruta' ? 'clase' : 'material'}-${Date.now()}.pdf`;
  const { error } = await db().storage.from(BUCKET).upload(ruta, archivo, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(`No pudimos subir el PDF: ${error.message}`);

  const anterior = clase.medios?.[campo];
  await q(db().from('clases_medios').upsert({ clase_id: clase.id, [campo]: ruta }, { onConflict: 'clase_id' }), 'No pudimos guardar el PDF.');
  if (campo === 'material_ruta') await q(db().from('clases').update({ tiene_material: true }).eq('id', clase.id));
  if (anterior) await db().storage.from(BUCKET).remove([anterior]);
}

export async function quitarPdf(clase, campo) {
  const ruta = clase.medios?.[campo];
  await q(db().from('clases_medios').update({ [campo]: null }).eq('clase_id', clase.id), 'No pudimos quitar el PDF.');
  if (campo === 'material_ruta') await q(db().from('clases').update({ tiene_material: false }).eq('id', clase.id));
  if (ruta) await db().storage.from(BUCKET).remove([ruta]);
}

/** Link temporal para que el admin revise el PDF subido. */
export async function verPdf(ruta) {
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(ruta, 300);
  if (error) throw new Error('No pudimos abrir el PDF.');
  return data.signedUrl;
}

// ---------------- Videos (Bunny Stream, subida directa por TUS) ----------------

/** Sube el video directo a Bunny. onProgreso(0..100). Devuelve cuando la subida terminó y quedó asociado. */
export async function subirVideo(clase, archivo, onProgreso) {
  if (!archivo.type.startsWith('video/')) throw new Error('El archivo tiene que ser un video.');
  const firma = await api('/admin/videos', { method: 'POST', body: { claseId: clase.id } });
  const { Upload } = await import('tus-js-client');
  await new Promise((resolver, rechazar) => {
    const subida = new Upload(archivo, {
      endpoint: firma.endpoint,
      retryDelays: [0, 3000, 10000, 30000],
      chunkSize: 50 * 1024 * 1024,
      headers: {
        AuthorizationSignature: firma.firma,
        AuthorizationExpire: String(firma.vence),
        VideoId: firma.videoId,
        LibraryId: String(firma.biblioteca),
      },
      metadata: { filetype: archivo.type, title: archivo.name },
      onProgress: (subido, total) => onProgreso?.(Math.round((subido / total) * 100)),
      onError: (e) => rechazar(new Error(`Se cortó la subida del video: ${e.message}`)),
      onSuccess: resolver,
    });
    subida.start();
  });
  await api('/admin/videos/confirmar', { method: 'POST', body: { claseId: clase.id, videoId: firma.videoId } });
}

/** { estado: 'sin-video' | 'subiendo' | 'procesando' | 'listo' | 'error', duracionS } */
export const estadoVideo = (clase) => api(`/admin/videos/${clase.id}`);
export const quitarVideo = (clase) => api(`/admin/videos/${clase.id}`, { method: 'DELETE' });

// ---------------- Usuarios, accesos y ventas ----------------

export const listarUsuarios = () => q(db().rpc('admin_usuarios'), 'No pudimos cargar los usuarios.');

export const listarAccesos = () =>
  q(db().from('accesos').select('usuario_id, curso_id, origen, otorgado_at, vence_at, revocado_at, cursos (titulo)'), 'No pudimos cargar los accesos.');

export async function darAcceso(usuarioId, cursoId) {
  const existente = await q(db().from('accesos').select('usuario_id').eq('usuario_id', usuarioId).eq('curso_id', cursoId));
  if (existente.length) {
    return q(db().from('accesos').update({ revocado_at: null, otorgado_at: new Date().toISOString() }).eq('usuario_id', usuarioId).eq('curso_id', cursoId), 'No pudimos dar el acceso.');
  }
  return q(db().from('accesos').insert({ usuario_id: usuarioId, curso_id: cursoId, origen: 'manual' }), 'No pudimos dar el acceso.');
}

export const quitarAcceso = (usuarioId, cursoId) =>
  q(db().from('accesos').update({ revocado_at: new Date().toISOString() }).eq('usuario_id', usuarioId).eq('curso_id', cursoId), 'No pudimos quitar el acceso.');

export const listarCompras = () =>
  q(
    db()
      .from('compras')
      .select('id, estado, monto, precio_lista, descuento, moneda, proveedor, pago_id, created_at, aprobada_at, usuario_id, cursos (titulo), cupones (codigo)')
      .order('created_at', { ascending: false })
      .limit(500),
    'No pudimos cargar las ventas.',
  );

// ---------------- Cupones ----------------

export async function listarCupones() {
  const [cupones, usos] = await Promise.all([
    q(db().from('cupones').select('*, cursos (titulo)').order('created_at', { ascending: false }), 'No pudimos cargar los cupones.'),
    q(db().from('compras').select('cupon_id').eq('estado', 'aprobada').not('cupon_id', 'is', null)),
  ]);
  const conteo = usos.reduce((m, u) => m.set(u.cupon_id, (m.get(u.cupon_id) || 0) + 1), new Map());
  return cupones.map((c) => ({ ...c, usos: conteo.get(c.id) || 0 }));
}

export const crearCupon = (datos) =>
  q(
    db().from('cupones').insert({
      codigo: datos.codigo.trim().toUpperCase(),
      descripcion: datos.descripcion?.trim() || null,
      tipo: datos.tipo,
      valor: Number(datos.valor),
      curso_id: datos.curso_id || null,
      valido_hasta: datos.valido_hasta ? new Date(`${datos.valido_hasta}T23:59:59`).toISOString() : null,
      usos_maximos: datos.usos_maximos ? Number(datos.usos_maximos) : null,
      usos_por_usuario: datos.usos_por_usuario ? Number(datos.usos_por_usuario) : null,
    }),
    'No pudimos crear el cupón.',
  );

export const cambiarCupon = (id, cambios) => q(db().from('cupones').update(cambios).eq('id', id), 'No pudimos actualizar el cupón.');
export const borrarCupon = (id) => q(db().from('cupones').delete().eq('id', id), 'Este cupón ya se usó: desactivalo en lugar de borrarlo.');

// ---------------- Turnos y arrepentimientos ----------------

export const listarTurnos = () =>
  q(db().from('turnos').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false }).limit(500), 'No pudimos cargar los turnos.');

export const listarArrepentimientos = () =>
  q(db().from('arrepentimientos').select('*').order('created_at', { ascending: false }), 'No pudimos cargar las solicitudes.');

export const atenderArrepentimiento = (id, respuesta) =>
  q(db().from('arrepentimientos').update({ atendido_at: new Date().toISOString(), respuesta: respuesta.trim() || null }).eq('id', id), 'No pudimos guardar.');

// ---------------- Contenido ----------------

export const listarTestimoniosAdmin = () => q(db().from('testimonios').select('*').order('orden'), 'No pudimos cargar los testimonios.');
export const guardarTestimonio = (datos, id) => {
  const fila = {
    texto: datos.texto.trim(),
    autor: datos.autor.trim(),
    permiso_at: datos.permiso_at,
    permiso_detalle: datos.permiso_detalle?.trim() || null,
    publicado: Boolean(datos.publicado),
    orden: Number(datos.orden) || 0,
  };
  return q(id ? db().from('testimonios').update(fila).eq('id', id) : db().from('testimonios').insert(fila), 'No pudimos guardar el testimonio.');
};
export const borrarTestimonio = (id) => q(db().from('testimonios').delete().eq('id', id), 'No pudimos borrar el testimonio.');

export const listarObrasSocialesAdmin = () => q(db().from('obras_sociales').select('*').order('orden'), 'No pudimos cargar las obras sociales.');
export const guardarObraSocial = (datos, id) => {
  const fila = { nombre: datos.nombre.trim(), activa: Boolean(datos.activa), orden: Number(datos.orden) || 0 };
  return q(id ? db().from('obras_sociales').update(fila).eq('id', id) : db().from('obras_sociales').insert(fila), 'No pudimos guardar la obra social.');
};
export const borrarObraSocial = (id) => q(db().from('obras_sociales').delete().eq('id', id), 'No pudimos borrar la obra social.');
