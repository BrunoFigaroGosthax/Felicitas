// Pruebas de la agenda multisistema con dos sistemas simulados en memoria.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { crearAgenda, superponen } from './nucleo.js';
import { registroMemoria } from './registro.js';

const HORAS = ['09:00', '09:30', '10:00', '10:30'];

/** Sistema simulado: guarda turnos y "ocupado" propios; puede fallar a pedido. */
function sistemaFalso(id, { principal = false } = {}) {
  let n = 0;
  const s = {
    id,
    nombre: id,
    principal,
    real: true,
    caido: false,
    turnosPropios: [], // turnos con datos de paciente
    bloqueos: [], // "ocupado" puestos desde afuera
    datosRecibidos: [], // todo lo que le llega al sistema, para verificar que no reciba datos de más
    revisar() {
      if (s.caido) throw new Error(`${id} no responde`);
    },
    async horarios(fecha) {
      s.revisar();
      const ocupadas = [...s.turnosPropios, ...s.bloqueos].filter((t) => t.fecha === fecha);
      return HORAS.map((hora) => ({ hora, disponible: !ocupadas.some((t) => superponen({ hora, duracionMin: 30 }, t)) }));
    },
    async ocupados(fecha) {
      s.revisar();
      return [...s.turnosPropios, ...s.bloqueos].filter((t) => t.fecha === fecha).map((t) => ({ hora: t.hora, duracionMin: t.duracionMin }));
    },
    async turnos(desde, hasta) {
      s.revisar();
      return [...s.turnosPropios, ...s.bloqueos].filter((t) => t.fecha >= desde && t.fecha <= hasta);
    },
    async reservar(datos) {
      s.revisar();
      s.datosRecibidos.push(datos);
      const t = { id: `${id}-t${++n}`, fecha: datos.fecha, hora: datos.hora, duracionMin: 30 };
      s.turnosPropios.push(t);
      return { id: t.id, fecha: t.fecha, hora: t.hora };
    },
    async cancelar(tid) {
      s.revisar();
      s.turnosPropios = s.turnosPropios.filter((t) => t.id !== tid);
    },
    async bloquear(franja) {
      s.revisar();
      s.datosRecibidos.push(franja);
      const b = { id: `${id}-b${++n}`, ...franja };
      s.bloqueos.push(b);
      return { id: b.id };
    },
    async desbloquear(bid) {
      s.revisar();
      s.bloqueos = s.bloqueos.filter((b) => b.id !== bid);
    },
  };
  return s;
}

const silencio = { error: () => {} };
let drapp, otro, registro, agenda;
beforeEach(() => {
  drapp = sistemaFalso('drapp', { principal: true });
  otro = sistemaFalso('otro');
  registro = registroMemoria();
  agenda = crearAgenda({ sistemas: [drapp, otro], registro, log: silencio });
});

const F = '2026-11-02';
const paciente = { fecha: F, hora: '09:30', paciente: 'Sofía', email: 'a@b.c', motivo: 'control', detalle: 'tos' };

test('superponen: franjas de 30 minutos', () => {
  assert.equal(superponen({ hora: '09:00', duracionMin: 30 }, { hora: '09:15', duracionMin: 30 }), true);
  assert.equal(superponen({ hora: '09:00', duracionMin: 30 }, { hora: '09:30', duracionMin: 30 }), false);
  assert.equal(superponen({ hora: '09:30', duracionMin: 30 }, { hora: '09:00', duracionMin: 60 }), true);
});

test('C: la web solo ofrece lo libre en TODOS los sistemas', async () => {
  otro.turnosPropios.push({ id: 'o1', fecha: F, hora: '10:00', duracionMin: 60 }); // ocupa 10:00 y 10:30
  const h = await agenda.disponibilidad(F);
  assert.deepEqual(h.filter((x) => x.disponible).map((x) => x.hora), ['09:00', '09:30']);
});

test('A y B: la reserva web va solo al principal; al otro le llega un "ocupado" sin datos', async () => {
  const t = await agenda.reservar(paciente);
  assert.equal(t.sistema, 'drapp');
  assert.equal(drapp.turnosPropios.length, 1);
  assert.equal(otro.turnosPropios.length, 0);
  assert.equal(otro.bloqueos.length, 1);
  assert.deepEqual(otro.datosRecibidos, [{ fecha: F, hora: '09:30', duracionMin: 30 }]); // nada del paciente
  assert.equal(registro.filas.length, 1);
  assert.equal(registro.filas[0].bloqueo_id, otro.bloqueos[0].id);
});

test('el horario reservado deja de ofrecerse', async () => {
  await agenda.reservar(paciente);
  const h = await agenda.disponibilidad(F);
  assert.equal(h.find((x) => x.hora === '09:30').disponible, false);
});

test('si el horario se ocupó en el otro sistema justo antes de confirmar → 409, sin reservar', async () => {
  otro.turnosPropios.push({ id: 'o1', fecha: F, hora: '09:30', duracionMin: 30 });
  await assert.rejects(agenda.reservar(paciente), (e) => e.status === 409 && /se acaba de ocupar/.test(e.publicMessage));
  assert.equal(drapp.turnosPropios.length, 0);
});

test('si el otro sistema no responde: no se ofrecen horarios (mejor eso que un turno repetido)', async () => {
  otro.caido = true;
  await assert.rejects(agenda.disponibilidad(F), (e) => e.status === 503);
  await assert.rejects(agenda.reservar(paciente), (e) => e.status === 503);
  assert.equal(drapp.turnosPropios.length, 0);
});

test('si el bloqueo falla después de reservar, queda pendiente y la reconciliación lo completa', async () => {
  const bloquear = otro.bloquear;
  otro.bloquear = async () => {
    throw new Error('timeout');
  };
  await agenda.reservar(paciente); // la reserva no se pierde
  assert.equal(registro.filas[0].bloqueo_id, null);
  assert.match(registro.filas[0].error, /timeout/);
  otro.bloquear = bloquear;
  const r = await agenda.reconciliar('2026-11-01', '2026-12-31');
  assert.equal(r.creados, 1);
  assert.equal(otro.bloqueos.length, 1);
  assert.equal(r.pendientes, 0);
});

test('cancelar libera el "ocupado" en el otro sistema', async () => {
  const t = await agenda.reservar(paciente);
  await agenda.cancelar('drapp', t.id);
  assert.equal(drapp.turnosPropios.length, 0);
  assert.equal(otro.bloqueos.length, 0);
  assert.equal(registro.filas.length, 0);
});

test('aviso de reserva en el otro sistema → "ocupado" en DrApp; la cancelación lo libera', async () => {
  otro.turnosPropios.push({ id: 'o1', fecha: F, hora: '10:00', duracionMin: 30 });
  await agenda.procesarAviso('otro', { tipo: 'reserva', id: 'o1', fecha: F, hora: '10:00', duracionMin: 30 });
  assert.equal(drapp.bloqueos.length, 1);
  await agenda.procesarAviso('otro', { tipo: 'reserva', id: 'o1', fecha: F, hora: '10:00', duracionMin: 30 }); // aviso repetido
  assert.equal(drapp.bloqueos.length, 1, 'no duplica');
  await agenda.procesarAviso('otro', { tipo: 'cancelacion', id: 'o1' });
  assert.equal(drapp.bloqueos.length, 0);
});

test('los avisos sobre nuestros propios "ocupado" se ignoran (sin bucles)', async () => {
  await agenda.reservar(paciente);
  const bloqueoEnOtro = otro.bloqueos[0].id;
  const r = await agenda.procesarAviso('otro', { tipo: 'reserva', id: bloqueoEnOtro, fecha: F, hora: '09:30', duracionMin: 30 });
  assert.equal(r.ignorado, true);
  assert.equal(drapp.bloqueos.length, 0);
});

test('reconciliación: cubre avisos perdidos y saca bloqueos huérfanos', async () => {
  // Turno nuevo en el otro sistema cuyo aviso nunca llegó:
  otro.turnosPropios.push({ id: 'o9', fecha: F, hora: '10:30', duracionMin: 30 });
  // Turno web que se canceló directo en DrApp (sin aviso):
  const t = await agenda.reservar(paciente);
  drapp.turnosPropios = drapp.turnosPropios.filter((x) => x.id !== t.id);

  const r = await agenda.reconciliar('2026-11-01', '2026-12-31');
  assert.equal(r.creados, 1);
  assert.equal(r.liberados, 1);
  assert.deepEqual(drapp.bloqueos.map((b) => b.hora), ['10:30']);
  assert.equal(otro.bloqueos.length, 0);
  // Una segunda pasada no cambia nada.
  const r2 = await agenda.reconciliar('2026-11-01', '2026-12-31');
  assert.deepEqual([r2.creados, r2.liberados], [0, 0]);
});

test('reconciliación: si un sistema no responde, no se tocan sus bloqueos', async () => {
  otro.turnosPropios.push({ id: 'o1', fecha: F, hora: '10:00', duracionMin: 30 });
  await agenda.procesarAviso('otro', { tipo: 'reserva', id: 'o1', fecha: F, hora: '10:00', duracionMin: 30 });
  otro.caido = true;
  const r = await agenda.reconciliar('2026-11-01', '2026-12-31');
  assert.equal(r.errores.length, 1);
  assert.equal(drapp.bloqueos.length, 1, 'el "ocupado" del turno del otro sistema se mantiene');
});

test('si falla el registro después de reservar, la reserva igual se confirma (no hay turno doble)', async () => {
  registro.deOrigen = async () => {
    throw new Error('base caída');
  };
  const t = await agenda.reservar(paciente);
  assert.equal(t.sistema, 'drapp');
  assert.equal(drapp.turnosPropios.length, 1);
  await agenda.cancelar('drapp', t.id); // y cancelar tampoco falla
  assert.equal(drapp.turnosPropios.length, 0);
});

test('con un solo sistema funciona igual (y no toca el registro)', async () => {
  const roto = registroMemoria();
  roto.deOrigen = async () => {
    throw new Error('no debería consultarse');
  };
  const sola = crearAgenda({ sistemas: [sistemaFalso('drapp', { principal: true })], registro: roto, log: silencio });
  await sola.cancelar('drapp', (await sola.reservar({ ...paciente, hora: '10:00' })).id);
});

test('con un solo sistema funciona igual', async () => {
  const sola = crearAgenda({ sistemas: [sistemaFalso('drapp', { principal: true })], registro: registroMemoria(), log: silencio });
  const t = await sola.reservar(paciente);
  assert.equal(t.sistema, 'drapp');
  assert.equal((await sola.disponibilidad(F)).find((x) => x.hora === '09:30').disponible, false);
});
