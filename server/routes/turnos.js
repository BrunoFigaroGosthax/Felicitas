import { Router } from 'express';
import { agenda } from '../lib/agenda/index.js';
import { config, configurado } from '../lib/config.js';
import { enviarSinFallar } from '../lib/email.js';
import { errorPublico, handler, noConfigurado } from '../lib/errores.js';
import { limite } from '../lib/limite.js';
import { turnoCancelado, turnoConfirmado } from '../lib/plantillas.js';
import { admin, sinError } from '../lib/supabase.js';
import { leerTokenTurno, tokenTurno } from '../lib/tokens.js';
import { esEmail, esFechaReal, esTelefono, HORA, texto, UUID } from '../lib/validar.js';

const router = Router();
const MOTIVOS = ['control', 'enfermedad', 'adolescencia', 'primera'];

/** Hoy en Argentina, 'YYYY-MM-DD' (el server corre en UTC). */
export const hoyAR = (desplazamientoDias = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(Date.now() + desplazamientoDias * 864e5));

export const linkCancelar = (turnoId) => `${config.siteUrl}/turnos/cancelar?t=${encodeURIComponent(tokenTurno(turnoId))}`;

// GET /api/turnos/disponibilidad?fecha=YYYY-MM-DD → { horarios: [{ hora, disponible }] }
// Libre = libre en DrApp y en cualquier otro sistema de turnos que use la doctora.
router.get(
  '/disponibilidad',
  limite({ ventanaMs: 60_000, maximo: 60 }),
  handler(async (req, res) => {
    const { fecha } = req.query;
    if (!esFechaReal(fecha) || fecha < hoyAR()) throw errorPublico(400, 'Fecha inválida.');
    res.json({ horarios: await agenda.disponibilidad(fecha) });
  }),
);

// POST /api/turnos → { id, fecha, hora }
// Se reserva SOLO en el sistema principal (con los datos del paciente); a los demás va un "ocupado".
router.post(
  '/',
  limite({ ventanaMs: 15 * 60_000, maximo: 5 }),
  handler(async (req, res) => {
    const d = req.body || {};
    const datos = {
      paciente: texto(d.paciente, 120),
      nacimiento: d.nacimiento,
      responsable: texto(d.responsable, 120),
      telefono: texto(d.telefono, 20),
      email: texto(d.email, 254),
      obraSocial: texto(d.obraSocial, 120),
      motivo: d.motivo,
      detalle: texto(d.detalle, 1000),
      fecha: d.fecha,
      hora: d.hora,
    };
    const hoy = hoyAR();
    const revisar = [];
    if (!datos.paciente) revisar.push('nombre del paciente');
    if (!esFechaReal(datos.nacimiento) || datos.nacimiento > hoy) revisar.push('fecha de nacimiento');
    if (!datos.responsable) revisar.push('adulto responsable');
    if (!esTelefono(datos.telefono)) revisar.push('teléfono');
    if (!esEmail(datos.email)) revisar.push('email');
    if (!datos.obraSocial) revisar.push('obra social');
    if (!MOTIVOS.includes(datos.motivo)) revisar.push('motivo');
    if (!esFechaReal(datos.fecha) || datos.fecha < hoy) revisar.push('día');
    if (!HORA.test(datos.hora || '')) revisar.push('horario');
    if (revisar.length) throw errorPublico(400, `Revisá estos datos: ${revisar.join(', ')}.`);

    const consentimiento = texto(d.consentimiento, 40);
    if (!consentimiento) throw errorPublico(400, 'Para reservar tenés que aceptar la política de privacidad.');

    const turno = await agenda.reservar(datos);

    // Registro mínimo (sin datos del paciente). Si falla, el turno igual quedó reservado: no se corta.
    let registroId = null;
    if (configurado.supabase) {
      const { data, error } = await admin
        .from('turnos')
        .insert({
          sistema: turno.sistema,
          externo_id: turno.id,
          fecha: datos.fecha,
          hora: datos.hora,
          motivo: datos.motivo,
          responsable_nombre: datos.responsable,
          telefono: datos.telefono,
          email: datos.email,
          consentimiento_version: consentimiento,
        })
        .select('id')
        .single();
      if (error) console.error('No se pudo registrar el turno en Supabase:', error.message);
      registroId = data?.id ?? null;
    }

    await enviarSinFallar({
      para: datos.email,
      ...turnoConfirmado({ ...datos, linkCancelar: registroId ? linkCancelar(registroId) : null }),
    });
    res.status(201).json({ id: turno.id, fecha: turno.fecha, hora: turno.hora });
  }),
);

async function turnoDelToken(token) {
  if (!configurado.supabase) throw noConfigurado('La cancelación online');
  const id = leerTokenTurno(token);
  if (!id || !UUID.test(id)) throw errorPublico(404, 'El link no es válido. Escribinos por WhatsApp para cancelar.');
  const turno = sinError(await admin.from('turnos').select('*').eq('id', id).maybeSingle(), 'turnos');
  if (!turno) throw errorPublico(404, 'No encontramos el turno. Escribinos por WhatsApp.');
  return turno;
}

const resumen = (t) => ({ fecha: t.fecha, hora: t.hora.slice(0, 5), motivo: t.motivo, estado: t.estado, pasado: t.fecha < hoyAR() });

// GET /api/turnos/cancelar?t=… → { fecha, hora, motivo, estado, pasado } (sin datos personales)
router.get(
  '/cancelar',
  limite({ ventanaMs: 60_000, maximo: 30 }),
  handler(async (req, res) => {
    res.json(resumen(await turnoDelToken(req.query.t)));
  }),
);

// POST /api/turnos/cancelar { t } → cancela en su sistema y libera los "ocupado" de los demás.
router.post(
  '/cancelar',
  limite({ ventanaMs: 15 * 60_000, maximo: 10 }),
  handler(async (req, res) => {
    const turno = await turnoDelToken(req.body?.t);
    if (turno.estado === 'cancelado') return res.json(resumen(turno));
    if (turno.fecha < hoyAR()) throw errorPublico(400, 'Ese turno ya pasó.');
    await agenda.cancelar(turno.sistema, turno.externo_id);
    sinError(
      await admin.from('turnos').update({ estado: 'cancelado', cancelado_at: new Date().toISOString() }).eq('id', turno.id),
      'turnos',
    );
    await enviarSinFallar({ para: turno.email, ...turnoCancelado({ responsable: turno.responsable_nombre, fecha: turno.fecha, hora: turno.hora.slice(0, 5) }) });
    res.json({ ...resumen(turno), estado: 'cancelado' });
  }),
);

export default router;
