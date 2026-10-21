// Avisos de los sistemas de turnos y tareas programadas de la agenda.
import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { agenda, sistemaPorId } from '../lib/agenda/index.js';
import { configurado } from '../lib/config.js';
import { enviarSinFallar } from '../lib/email.js';
import { errorPublico, handler, noConfigurado } from '../lib/errores.js';
import { turnoRecordatorio } from '../lib/plantillas.js';
import { admin, sinError } from '../lib/supabase.js';
import { hoyAR, linkCancelar } from './turnos.js';

const router = Router();
const DIAS_RECONCILIAR = 60;

/** Las tareas programadas (Vercel Cron) mandan "Authorization: Bearer <CRON_SECRET>". */
function soloCron(req, _res, next) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return next(noConfigurado('La tarea programada'));
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(req.get('authorization') || '');
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return next(errorPublico(401, 'No autorizado.'));
  next();
}

export const reconciliarAgenda = () => agenda.reconciliar(hoyAR(), hoyAR(DIAS_RECONCILIAR));

// POST /api/agenda/avisos/:sistema → webhook de un sistema de turnos (reserva o cancelación).
// Cada adaptador verifica la firma del aviso y lo traduce; los "ocupado" propios se ignoran.
router.post(
  '/avisos/:sistema',
  handler(async (req, res) => {
    const sistema = sistemaPorId(req.params.sistema);
    if (!sistema?.real) return res.sendStatus(404);
    const aviso = sistema.leerAviso(req);
    if (!aviso) return res.sendStatus(200);
    res.json(await agenda.procesarAviso(sistema.id, aviso));
  }),
);

// GET /api/agenda/reconciliar → revisión periódica (avisos perdidos, bloqueos pendientes).
router.get(
  '/reconciliar',
  soloCron,
  handler(async (_req, res) => {
    res.json(await reconciliarAgenda());
  }),
);

// GET /api/agenda/recordatorios → email el día anterior a cada turno pedido por la web.
router.get(
  '/recordatorios',
  soloCron,
  handler(async (_req, res) => {
    if (!configurado.supabase) throw noConfigurado('Los recordatorios');
    const manana = hoyAR(1);
    const turnos = sinError(
      await admin.from('turnos').select('*').eq('fecha', manana).eq('estado', 'reservado').is('recordatorio_enviado_at', null),
      'turnos',
    );
    let enviados = 0;
    for (const t of turnos) {
      await enviarSinFallar({
        para: t.email,
        ...turnoRecordatorio({ responsable: t.responsable_nombre, fecha: t.fecha, hora: t.hora.slice(0, 5), linkCancelar: linkCancelar(t.id) }),
      });
      sinError(await admin.from('turnos').update({ recordatorio_enviado_at: new Date().toISOString() }).eq('id', t.id), 'turnos');
      enviados++;
    }
    res.json({ fecha: manana, enviados });
  }),
);

export default router;
