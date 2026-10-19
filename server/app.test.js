// Pruebas de la API sin integraciones configuradas (como en desarrollo): DrApp y emails simulados,
// Supabase / Mercado Pago / Bunny responden 503.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

for (const k of Object.keys(process.env)) {
  if (/^(SUPABASE|MP|BUNNY|RESEND|DRAPP)_/.test(k)) delete process.env[k];
}
console.info = () => {}; // silenciar los emails simulados

const { default: app } = await import('./app.js');
let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const pedir = async (ruta, { method = 'GET', body, raw } = {}) => {
  const res = await fetch(`${base}${ruta}`, {
    method,
    headers: body || raw ? { 'Content-Type': 'application/json' } : undefined,
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const turno = {
  paciente: 'Sofía Pérez',
  nacimiento: '2020-05-10',
  responsable: 'Laura Pérez',
  telefono: '11 2345 6789',
  email: 'laura@correo.com',
  obraSocial: 'Particular',
  motivo: 'control',
  fecha: enDias(30),
  hora: '09:30',
  consentimiento: '2026-10',
};

test('salud', async () => {
  assert.deepEqual((await pedir('/salud')).data, { ok: true });
});

test('disponibilidad: fecha válida y futura', async () => {
  const ok = await pedir(`/turnos/disponibilidad?fecha=${enDias(5)}`);
  assert.equal(ok.status, 200);
  assert.ok(Array.isArray(ok.data.horarios) && ok.data.horarios.length > 0);
  assert.equal((await pedir('/turnos/disponibilidad?fecha=2026-02-30')).status, 400);
  assert.equal((await pedir('/turnos/disponibilidad?fecha=2020-01-01')).status, 400);
});

test('turnos: validación, consentimiento, alta y límite de intentos', async () => {
  // 1: faltan datos
  const mal = await pedir('/turnos', { method: 'POST', body: { ...turno, email: 'x', hora: '9', motivo: 'otro' } });
  assert.equal(mal.status, 400);
  assert.match(mal.data.error, /email/);
  assert.match(mal.data.error, /horario/);
  assert.match(mal.data.error, /motivo/);

  // 2: sin consentimiento
  const sinOk = await pedir('/turnos', { method: 'POST', body: { ...turno, consentimiento: '' } });
  assert.equal(sinOk.status, 400);
  assert.match(sinOk.data.error, /privacidad/);

  // 3: nacimiento futuro
  assert.equal((await pedir('/turnos', { method: 'POST', body: { ...turno, nacimiento: enDias(3) } })).status, 400);

  // 4 y 5: altas correctas
  for (let i = 0; i < 2; i++) {
    const ok = await pedir('/turnos', { method: 'POST', body: turno });
    assert.equal(ok.status, 201);
    assert.equal(ok.data.fecha, turno.fecha);
    assert.equal(ok.data.hora, turno.hora);
  }

  // 6: supera el límite de 5 por IP
  const limitado = await pedir('/turnos', { method: 'POST', body: turno });
  assert.equal(limitado.status, 429);
});

test('compras, clases y webhooks sin integraciones: 503 con mensaje claro', async () => {
  const compra = await pedir('/compras', { method: 'POST', body: { cursoId: '00000000-0000-0000-0000-000000000000' } });
  assert.equal(compra.status, 503);
  assert.match(compra.data.error, /no está disponible/);
  assert.equal((await pedir('/compras/precio', { method: 'POST', body: {} })).status, 503);
  assert.equal((await pedir('/clases/00000000-0000-0000-0000-000000000000/medio')).status, 503);
  assert.equal((await pedir('/webhooks/mercadopago?type=payment&data.id=1', { method: 'POST', body: {} })).status, 503);
  assert.equal((await pedir('/admin/videos', { method: 'POST', body: {} })).status, 503);
});

test('arrepentimiento: valida y devuelve código de seguimiento', async () => {
  assert.equal((await pedir('/arrepentimiento', { method: 'POST', body: { nombre: 'Ana' } })).status, 400);
  const ok = await pedir('/arrepentimiento', { method: 'POST', body: { nombre: 'Ana Gómez', email: 'ana@correo.com', compra: 'Curso de adolescencia' } });
  assert.equal(ok.status, 201);
  assert.match(ok.data.codigo, /^ARR-[0-9A-F]{8}$/);
});

test('JSON roto → 400; ruta inexistente → 404 en JSON', async () => {
  assert.equal((await pedir('/turnos', { method: 'POST', raw: '{roto' })).status, 400);
  const nf = await pedir('/no-existe');
  assert.equal(nf.status, 404);
  assert.equal(nf.data.error, 'No encontrado.');
});
