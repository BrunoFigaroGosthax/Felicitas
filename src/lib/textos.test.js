import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONTACTO, SEDES, TEXTOS_INICIO } from '../data/contenido.js';
import { normalizarInstagram, normalizarWhatsapp, parrafos, textosDelSitio } from './textos.js';

test('sin cambios guardados, quedan los textos originales', () => {
  for (const vacio of [undefined, null, {}, 'basura']) {
    const t = textosDelSitio(vacio);
    assert.deepEqual(t.inicio, TEXTOS_INICIO);
    assert.deepEqual(t.contacto, CONTACTO);
    assert.deepEqual(t.sedes, SEDES);
  }
});

test('los originales arman los mismos links que antes', () => {
  assert.equal(`https://wa.me/549${normalizarWhatsapp(CONTACTO.whatsapp)}`, CONTACTO.whatsappUrl);
  assert.equal(`https://instagram.com/${normalizarInstagram(CONTACTO.instagram)}`, CONTACTO.instagramUrl);
});

test('WhatsApp: acepta las formas habituales de escribir un número argentino', () => {
  for (const n of ['299 462-4870', '+54 9 299 462 4870', '5492994624870', '0299 15 462-4870', '(0299) 154624870']) {
    assert.equal(normalizarWhatsapp(n), '2994624870', n);
  }
  assert.equal(normalizarWhatsapp('011 15 1234-5678'), '1112345678');
  assert.equal(normalizarWhatsapp('462-4870'), null);
});

test('Instagram: con @, sin @ o con el link', () => {
  for (const u of ['@dra.felicitas', 'dra.felicitas', 'https://www.instagram.com/dra.felicitas/?hl=es']) assert.equal(normalizarInstagram(u), 'dra.felicitas', u);
  assert.equal(normalizarInstagram('con espacios'), null);
});

test('aplica solo los cambios válidos', () => {
  const t = textosDelSitio({
    inicio: { titulo: '  Nuevo título  ', bajada: '   ' },
    contacto: { whatsapp: '299 111-2222', email: 'no-es-email', instagram: '@otra.cuenta' },
    sedes: { ciev: { direccion: 'Belgrano 10, Neuquén', horarios: ['Martes de 16 a 20 h', ' '] } },
  });
  assert.equal(t.inicio.titulo, 'Nuevo título');
  assert.equal(t.inicio.bajada, TEXTOS_INICIO.bajada); // vacío = original
  assert.equal(t.contacto.whatsappUrl, 'https://wa.me/5492991112222');
  assert.equal(t.contacto.email, CONTACTO.email); // inválido = original
  assert.equal(t.contacto.instagramUrl, 'https://instagram.com/otra.cuenta');
  assert.equal(t.sedes[0].direccion, 'Belgrano 10, Neuquén');
  assert.match(t.sedes[0].mapa, /Belgrano%2010/);
  assert.deepEqual(t.sedes[0].horarios, ['Martes de 16 a 20 h']);
  assert.equal(t.sedes[0].nombre, 'CIEV');
  assert.deepEqual(t.sedes[1], SEDES[1]);
});

test('párrafos separados por línea en blanco', () => {
  assert.deepEqual(parrafos('uno\nsigue\n\n  dos  \n\n\n'), ['uno\nsigue', 'dos']);
});
