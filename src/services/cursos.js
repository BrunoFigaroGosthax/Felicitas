// Cursos, compras y certificados. Con Supabase lee la base; sin Supabase (modo demo) usa
// src/data/cursos.js y guarda compras y certificados de prueba en el navegador.
import { CURSOS } from '../data/cursos.js';
import { supabase } from '../lib/supabase.js';
import { api, esperar, USE_MOCKS } from './api.js';
import { obtenerPerfil, obtenerSesion } from './auth.js';
import { duracionTexto } from './formato.js';
import { leerProgreso, progresoLocal } from './progreso.js';

const CAMPOS =
  'id, slug, titulo, resumen, descripcion, formato, precio, moneda, portada_fondo, portada_ondas, portada_imagen, ' +
  'destacado, otorga_certificado, orden, clases (id, slug, titulo, descripcion, tipo, orden, duracion_segundos, muestra, tiene_material)';

function desdeDb(c, comprados) {
  return {
    id: c.id,
    slug: c.slug,
    titulo: c.titulo,
    resumen: c.resumen,
    descripcion: c.descripcion,
    formato: c.formato,
    precio: Number(c.precio),
    moneda: c.moneda,
    destacado: c.destacado,
    otorgaCertificado: c.otorga_certificado,
    comprado: comprados.has(c.id),
    portada: { fondo: c.portada_fondo, ondas: c.portada_ondas, imagen: c.portada_imagen },
    clases: [...c.clases]
      .sort((a, b) => a.orden - b.orden)
      .map((cl) => ({
        id: cl.id,
        slug: cl.slug,
        titulo: cl.titulo,
        descripcion: cl.descripcion,
        tipo: cl.tipo,
        duracion: duracionTexto(cl.duracion_segundos),
        muestra: cl.muestra,
        material: cl.tiene_material,
      })),
  };
}

// ---- Modo demo: compras y certificados en el navegador ----
const leerDemo = (clave) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) || [];
  } catch {
    return [];
  }
};
const guardarDemo = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento */
  }
};
const DEMO_COMPRAS = 'felicitas:demo-compras';
const DEMO_CERTIFICADOS = 'felicitas:demo-certificados';
const demo = (c, comprados) => ({ ...c, id: c.slug, comprado: comprados.has(c.slug) });

/** IDs de los cursos pagos a los que el usuario tiene acceso. */
async function cursosComprados() {
  const sesion = await obtenerSesion();
  if (!sesion) return new Set();
  if (!supabase) return new Set(leerDemo(DEMO_COMPRAS));
  const { data, error } = await supabase.from('accesos').select('curso_id, vence_at').is('revocado_at', null);
  if (error) return new Set();
  const ahora = new Date();
  return new Set(data.filter((a) => !a.vence_at || new Date(a.vence_at) > ahora).map((a) => a.curso_id));
}

export async function listarCursos() {
  const comprados = await cursosComprados();
  if (!supabase) return CURSOS.map((c) => demo(c, comprados));
  const { data, error } = await supabase.from('cursos').select(CAMPOS).order('orden');
  if (error) throw new Error('No pudimos cargar los cursos. Probá de nuevo.');
  return data.map((c) => desdeDb(c, comprados));
}

export async function obtenerCurso(slug) {
  const comprados = await cursosComprados();
  if (!supabase) {
    const c = CURSOS.find((x) => x.slug === slug);
    return c ? demo(c, comprados) : null;
  }
  const { data, error } = await supabase.from('cursos').select(CAMPOS).eq('slug', slug).maybeSingle();
  if (error) throw new Error('No pudimos cargar el curso. Probá de nuevo.');
  return data ? desdeDb(data, comprados) : null;
}

/** ¿Se puede ver esta clase? Gratis, de muestra o curso comprado. (Lo verifica también el backend.) */
export function puedeVerClase(curso, clase) {
  return curso.precio === 0 || curso.comprado || Boolean(clase.muestra);
}

/** URLs firmadas de la clase: { video, pdf, material }. En modo demo, todas null. */
export async function obtenerMedio(clase) {
  if (USE_MOCKS) return { video: null, pdf: null, material: null };
  return api(`/clases/${clase.id}/medio`);
}

/** Precio con un código de descuento: { precioLista, descuento, monto, conCupon }. */
export async function calcularPrecio(curso, codigo) {
  if (USE_MOCKS) {
    await esperar(300);
    const pct = { PRUEBA10: 10, PRUEBA100: 100 }[codigo?.trim().toUpperCase()];
    if (codigo && !pct) throw new Error('El código de descuento no es válido o ya venció.');
    const descuento = pct ? Math.round(curso.precio * pct) / 100 : 0;
    return { precioLista: curso.precio, descuento, monto: curso.precio - descuento, conCupon: Boolean(pct) };
  }
  return api('/compras/precio', { method: 'POST', body: { cursoId: curso.id, codigo } });
}

/** Inicia la compra: { url } para ir a Mercado Pago, o { aprobada: true } si quedó sin cargo. */
export async function comprar(curso, codigo) {
  if (USE_MOCKS) {
    await esperar(500);
    guardarDemo(DEMO_COMPRAS, [...new Set([...leerDemo(DEMO_COMPRAS), curso.slug])]);
    return { aprobada: true };
  }
  return api('/compras', { method: 'POST', body: { cursoId: curso.id, codigo } });
}

/** Cursos comprados o empezados: [{ curso, completadas, total }]. */
export async function misCursos() {
  const cursos = await listarCursos();
  if (!supabase) {
    return cursos
      .map((curso) => ({ curso, completadas: progresoLocal(curso.slug).length, total: curso.clases.length }))
      .filter((x) => x.curso.comprado || x.completadas > 0);
  }
  const { data, error } = await supabase.from('progreso_por_curso').select('curso_id, completadas, ultima_actividad');
  if (error) throw new Error('No pudimos cargar tus cursos.');
  const porCurso = new Map(data.map((p) => [p.curso_id, p]));
  return cursos
    .filter((c) => c.comprado || porCurso.get(c.id)?.ultima_actividad)
    .map((curso) => ({ curso, completadas: porCurso.get(curso.id)?.completadas ?? 0, total: curso.clases.length }));
}

// ---- Certificados ----
// Forma: { codigo, nombre_alumno, curso_titulo, emitido_at }

export async function emitirCertificado(curso) {
  if (!supabase) {
    await esperar(400);
    const vistas = await leerProgreso(curso, false);
    const faltan = curso.clases.filter((c) => !vistas.includes(c.id)).length;
    if (faltan) throw new Error(`Te ${faltan === 1 ? 'falta 1 clase' : `faltan ${faltan} clases`} para terminar el curso.`);
    const { nombre } = await obtenerPerfil();
    if (!nombre) throw new Error('Completá tu nombre en Mi cuenta: es el que figura en el certificado.');
    const certificados = leerDemo(DEMO_CERTIFICADOS);
    const existente = certificados.find((c) => c.curso_slug === curso.slug);
    if (existente) return existente;
    const nuevo = {
      codigo: `DEMO${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      nombre_alumno: nombre,
      curso_titulo: curso.titulo,
      curso_slug: curso.slug,
      emitido_at: new Date().toISOString(),
    };
    guardarDemo(DEMO_CERTIFICADOS, [...certificados, nuevo]);
    return nuevo;
  }
  const { data, error } = await supabase.rpc('emitir_certificado', { p_curso_id: curso.id });
  if (error) throw new Error(error.code === 'P0001' ? error.message : 'No pudimos emitir el certificado. Probá de nuevo.');
  return data;
}

export async function misCertificados() {
  if (!supabase) return leerDemo(DEMO_CERTIFICADOS);
  const { data, error } = await supabase
    .from('certificados')
    .select('codigo, nombre_alumno, curso_titulo, emitido_at')
    .order('emitido_at', { ascending: false });
  if (error) throw new Error('No pudimos cargar tus certificados.');
  return data;
}

/** Verificación pública por código. null si no existe. */
export async function verificarCertificado(codigo) {
  const limpio = codigo.trim().toUpperCase();
  if (!supabase) {
    await esperar(300);
    return leerDemo(DEMO_CERTIFICADOS).find((c) => c.codigo === limpio) || null;
  }
  const { data, error } = await supabase.rpc('verificar_certificado', { p_codigo: limpio });
  if (error) throw new Error('No pudimos verificar el certificado. Probá de nuevo.');
  return data?.[0] ? { ...data[0], codigo: limpio } : null;
}
