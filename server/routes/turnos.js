import { Router } from 'express';
import { configurado } from '../lib/config.js';
import { crearTurno, disponibilidad } from '../lib/drapp.js';
import { enviarSinFallar } from '../lib/email.js';
import { errorPublico, handler } from '../lib/errores.js';
import { limite } from '../lib/limite.js';
import { turnoConfirmado } from '../lib/plantillas.js';
import { admin } from '../lib/supabase.js';
import { esEmail, esFechaReal, esTelefono, HORA, texto } from '../lib/validar.js';

const router = Router();
const MOTIVOS = ['control', 'enfermedad', 'adolescencia', 'primera'];

/** Hoy en Argentina, 'YYYY-MM-DD' (el server corre en UTC). */
const hoyAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

// GET /api/turnos/disponibilidad?fecha=YYYY-MM-DD → { horarios: [{ hora, disponible }] }
router.get(
  '/disponibilidad',
  limite({ ventanaMs: 60_000, maximo: 60 }),
  handler(async (req, res) => {
    const { fecha } = req.query;
    if (!esFechaReal(fecha) || fecha < hoyAR()) throw errorPublico(400, 'Fecha inválida.');
    res.json({ horarios: await disponibilidad(fecha) });
  }),
);

// POST /api/turnos → { id, fecha, hora }
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

    const turno = await crearTurno(datos);

    // Registro mínimo (sin datos del paciente). Si falla, el turno igual quedó en DrApp: no se corta.
    if (configurado.supabase) {
      const { error } = await admin.from('turnos').insert({
        drapp_id: turno.id,
        fecha: datos.fecha,
        hora: datos.hora,
        motivo: datos.motivo,
        responsable_nombre: datos.responsable,
        telefono: datos.telefono,
        email: datos.email,
        consentimiento_version: consentimiento,
      });
      if (error) console.error('No se pudo registrar el turno en Supabase:', error.message);
    }

    await enviarSinFallar({ para: datos.email, ...turnoConfirmado(datos) });
    res.status(201).json(turno);
  }),
);

export default router;
