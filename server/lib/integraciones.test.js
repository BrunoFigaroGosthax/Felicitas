import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { test } from 'node:test';
import { urlArchivo, urlVideo } from './bunny.js';
import { estadoCompra, firmaValida } from './mercadopago.js';
import { esEmail, esFechaReal, esTelefono, HORA, texto } from './validar.js';
import { transicionValida } from '../routes/webhooks.js';

const SECRETO = 'secreto-de-prueba';
const firmar = (manifiesto) => createHmac('sha256', SECRETO).update(manifiesto).digest('hex');

test('Mercado Pago: firma válida del webhook', () => {
  const v1 = firmar('id:123456;request-id:req-1;ts:1700000000;');
  assert.equal(firmaValida({ xSignature: `ts=1700000000,v1=${v1}`, xRequestId: 'req-1', dataId: '123456', secreto: SECRETO }), true);
});

test('Mercado Pago: data.id alfanumérico se firma en minúsculas', () => {
  const v1 = firmar('id:abc123;request-id:req-1;ts:1700000000;');
  assert.equal(firmaValida({ xSignature: `ts=1700000000, v1=${v1}`, xRequestId: 'req-1', dataId: 'ABC123', secreto: SECRETO }), true);
});

test('Mercado Pago: rechaza firma alterada, otro id, sin secreto o sin header', () => {
  const v1 = firmar('id:123456;request-id:req-1;ts:1700000000;');
  const base = { xSignature: `ts=1700000000,v1=${v1}`, xRequestId: 'req-1', dataId: '123456', secreto: SECRETO };
  assert.equal(firmaValida({ ...base, dataId: '999' }), false);
  assert.equal(firmaValida({ ...base, xSignature: `ts=1700000001,v1=${v1}` }), false);
  assert.equal(firmaValida({ ...base, xSignature: 'ts=1700000000,v1=abc' }), false);
  assert.equal(firmaValida({ ...base, secreto: undefined }), false);
  assert.equal(firmaValida({ ...base, xSignature: undefined }), false);
});

test('Mercado Pago: estados', () => {
  assert.equal(estadoCompra('approved'), 'aprobada');
  assert.equal(estadoCompra('rejected'), 'rechazada');
  assert.equal(estadoCompra('cancelled'), 'cancelada');
  assert.equal(estadoCompra('refunded'), 'reembolsada');
  assert.equal(estadoCompra('charged_back'), 'reembolsada');
  assert.equal(estadoCompra('in_process'), 'pendiente');
});

test('Webhook: una compra aprobada no retrocede; reembolsada es final', () => {
  assert.equal(transicionValida('pendiente', 'aprobada'), true);
  assert.equal(transicionValida('rechazada', 'aprobada'), true);
  assert.equal(transicionValida('aprobada', 'reembolsada'), true);
  assert.equal(transicionValida('aprobada', 'pendiente'), false);
  assert.equal(transicionValida('aprobada', 'rechazada'), false);
  assert.equal(transicionValida('reembolsada', 'aprobada'), false);
  assert.equal(transicionValida('aprobada', 'aprobada'), false);
});

test('Bunny Stream: token = sha256(clave + videoId + vence)', () => {
  const url = new URL(urlVideo('video-guid', { clave: 'k', biblioteca: '42', duracionS: 60 }));
  assert.equal(url.origin + url.pathname, 'https://iframe.mediadelivery.net/embed/42/video-guid');
  const vence = url.searchParams.get('expires');
  assert.ok(Number(vence) > Date.now() / 1000);
  assert.equal(url.searchParams.get('token'), createHash('sha256').update(`kvideo-guid${vence}`).digest('hex'));
});

test('Bunny CDN: token base64url de sha256(clave + ruta + vence)', () => {
  const url = new URL(urlArchivo('/cursos/fiebre/guia.pdf', { clave: 'k', cdn: 'https://felicitas.b-cdn.net', duracionS: 60 }));
  assert.equal(url.pathname, '/cursos/fiebre/guia.pdf');
  const vence = url.searchParams.get('expires');
  const esperado = createHash('sha256').update(`k/cursos/fiebre/guia.pdf${vence}`).digest('base64url');
  assert.equal(url.searchParams.get('token'), esperado);
  assert.doesNotMatch(url.searchParams.get('token'), /[+/=]/);
});

test('Validaciones', () => {
  assert.equal(esEmail('ana@correo.com'), true);
  assert.equal(esEmail('ana@correo'), false);
  assert.equal(esTelefono('11 2345-6789'), true);
  assert.equal(esTelefono('123'), false);
  assert.equal(esFechaReal('2026-02-28'), true);
  assert.equal(esFechaReal('2026-02-30'), false);
  assert.equal(HORA.test('09:30'), true);
  assert.equal(HORA.test('9:30'), false);
  assert.equal(HORA.test('24:00'), false);
  assert.equal(texto('  hola  '), 'hola');
  assert.equal(texto('   '), null);
  assert.equal(texto(3), null);
  assert.equal(texto('abcdef', 3), 'abc');
});
