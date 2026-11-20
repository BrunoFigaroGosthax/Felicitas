// Textos del sitio: los originales del código (src/data/contenido.js) con los cambios hechos desde el panel
// (columna `ajustes.textos`). Funciones puras: las usan la web, el panel y las pruebas.
import { CONTACTO, mapa, SEDES, TEXTOS_INICIO } from '../data/contenido.js';

const soloDigitos = (s) => String(s || '').replace(/\D/g, '');

/** "299 462-4870" → "2994624870". Acepta +54 9 y el 0 / 15 de antes. Devuelve null si no son 10 dígitos. */
export function normalizarWhatsapp(numero) {
  let d = soloDigitos(numero).replace(/^549?/, '').replace(/^0/, '');
  if (d.length === 12) d = d.replace(/^(\d{2,4})15/, '$1'); // 0299 15 462-4870
  return d.length === 10 ? d : null;
}

/** "@dra.felicitas.pediatra", "instagram.com/dra.felicitas.pediatra" → "dra.felicitas.pediatra". null si no es válido. */
export function normalizarInstagram(usuario) {
  const u = String(usuario || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(u) ? u : null;
}

export const emailValido = (email) => /^\S+@\S+\.\S+$/.test(String(email || '').trim());

/** Párrafos separados por una línea en blanco. */
export const parrafos = (texto) =>
  String(texto || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Una línea por horario. */
export const lineas = (texto) =>
  String(texto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** { inicio, contacto, sedes } listos para mostrar. `textos` = lo guardado en la base (puede faltar todo). */
export function textosDelSitio(textos) {
  const t = textos && typeof textos === 'object' ? textos : {};

  const inicio = { ...TEXTOS_INICIO };
  for (const clave of Object.keys(TEXTOS_INICIO)) if (t.inicio?.[clave]?.trim?.()) inicio[clave] = t.inicio[clave].trim();

  const contacto = { ...CONTACTO };
  const whatsapp = normalizarWhatsapp(t.contacto?.whatsapp);
  if (whatsapp) {
    contacto.whatsapp = t.contacto.whatsapp.trim();
    contacto.whatsappUrl = `https://wa.me/549${whatsapp}`;
  }
  if (emailValido(t.contacto?.email)) contacto.email = t.contacto.email.trim();
  const instagram = normalizarInstagram(t.contacto?.instagram);
  if (instagram) {
    contacto.instagram = `@${instagram}`;
    contacto.instagramUrl = `https://instagram.com/${instagram}`;
  }

  const sedes = SEDES.map((sede) => {
    const c = t.sedes?.[sede.id];
    if (!c) return sede;
    const s = { ...sede };
    if (c.nombre?.trim()) s.nombre = c.nombre.trim();
    if (c.direccion?.trim()) {
      s.direccion = c.direccion.trim();
      s.mapa = mapa(s.direccion);
    }
    if (Array.isArray(c.horarios) && c.horarios.some((h) => h?.trim())) s.horarios = c.horarios.map((h) => h.trim()).filter(Boolean);
    if (c.pacientes?.trim()) s.pacientes = c.pacientes.trim();
    return s;
  });

  return { inicio, contacto, sedes };
}
