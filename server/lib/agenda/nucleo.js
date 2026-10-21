// Agenda con varios sistemas de turnos (DrApp, otro sistema, …) sin turnos repetidos.
//
// A. Cada turno vive en UN solo sistema, con los datos del paciente.
// B. A los demás sistemas solo se les manda un "ocupado" (fecha, hora, duración), sin datos.
// C. La web no tiene agenda propia: ofrece lo libre en TODOS y reserva en el principal.
//
// Cada sistema es un adaptador con esta forma:
//   id, nombre, principal (bool)
//   horarios(fecha)            → [{ hora: 'HH:MM', disponible }]   (solo el principal: lo que ofrece la web)
//   ocupados(fecha)            → [{ hora, duracionMin }]           (todo lo que tiene tomado ese día)
//   turnos(desde, hasta)       → [{ id, fecha, hora, duracionMin }] (incluye los "ocupado" que pusimos nosotros)
//   reservar(datos)            → { id, fecha, hora }
//   cancelar(id)
//   bloquear({ fecha, hora, duracionMin }) → { id }
//   desbloquear(id)
// `registro` guarda qué "ocupado" se creó en qué sistema por cada turno (tabla agenda_bloqueos).
import { errorPublico } from '../errores.js';

const minutos = (hora) => {
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
const hhmm = (hora) => String(hora).slice(0, 5);

/** ¿Se pisan dos franjas { hora, duracionMin }? */
export const superponen = (a, b) =>
  minutos(a.hora) < minutos(b.hora) + b.duracionMin && minutos(b.hora) < minutos(a.hora) + a.duracionMin;

export function crearAgenda({ sistemas, registro, duracionMin = 30, log = console }) {
  const principal = sistemas.find((s) => s.principal);
  if (!principal) throw new Error('La agenda necesita un sistema principal.');
  const secundarios = sistemas.filter((s) => s !== principal);
  const porId = new Map(sistemas.map((s) => [s.id, s]));

  /** Horarios del principal, quitando los que estén ocupados en cualquier otro sistema. */
  async function disponibilidad(fecha) {
    const horarios = await principal.horarios(fecha);
    if (!secundarios.length) return horarios;
    let ocupados;
    try {
      ocupados = (await Promise.all(secundarios.map((s) => s.ocupados(fecha)))).flat();
    } catch (e) {
      // Sin poder confirmar el otro sistema no se ofrece nada: mejor eso que un turno repetido.
      throw errorPublico(503, 'No pudimos confirmar la agenda en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.', e.message);
    }
    return horarios.map((h) => ({
      ...h,
      disponible: h.disponible && !ocupados.some((o) => superponen({ hora: h.hora, duracionMin }, o)),
    }));
  }

  /** Pone el "ocupado" en un sistema; si falla, queda pendiente para la próxima reconciliación. */
  async function bloquearEn(destino, reg) {
    try {
      const { id } = await destino.bloquear({ fecha: reg.fecha, hora: hhmm(reg.hora), duracionMin: reg.duracion_min });
      await registro.guardar({ ...reg, bloqueo_id: String(id), error: null, intentos: (reg.intentos || 0) + 1 });
      return true;
    } catch (e) {
      log.error(`No se pudo bloquear ${reg.fecha} ${reg.hora} en ${destino.id}: ${e.message}`);
      await registro.guardar({ ...reg, bloqueo_id: null, error: String(e.message).slice(0, 500), intentos: (reg.intentos || 0) + 1 });
      return false;
    }
  }

  /** Asegura que un turno del sistema `origen` esté "ocupado" en todos los demás. */
  async function propagar(origenId, turnoId, franja) {
    if (sistemas.length === 1) return 0;
    const existentes = await registro.deOrigen(origenId, turnoId);
    let creados = 0;
    for (const destino of sistemas) {
      if (destino.id === origenId) continue;
      const previo = existentes.find((r) => r.destino_sistema === destino.id);
      if (previo?.bloqueo_id) continue;
      const reg = previo ?? {
        origen_sistema: origenId,
        origen_id: turnoId,
        destino_sistema: destino.id,
        fecha: franja.fecha,
        hora: hhmm(franja.hora),
        duracion_min: franja.duracionMin ?? duracionMin,
        intentos: 0,
      };
      if (await bloquearEn(destino, reg)) creados++;
    }
    return creados;
  }

  /** Saca los "ocupado" que se crearon por un turno (al cancelarse). */
  async function liberar(origenId, turnoId) {
    if (sistemas.length === 1) return 0;
    let liberados = 0;
    for (const reg of await registro.deOrigen(origenId, turnoId)) {
      const destino = porId.get(reg.destino_sistema);
      try {
        if (reg.bloqueo_id && destino) await destino.desbloquear(reg.bloqueo_id);
        await registro.borrar(reg.id);
        liberados++;
      } catch (e) {
        log.error(`No se pudo liberar ${reg.bloqueo_id} en ${reg.destino_sistema}: ${e.message}`);
        await registro.guardar({ ...reg, error: `Al liberar: ${String(e.message).slice(0, 480)}` });
      }
    }
    return liberados;
  }

  /** Reserva desde la web: revisa de nuevo justo antes, reserva en el principal y bloquea en el resto. */
  async function reservar(datos) {
    const libres = await disponibilidad(datos.fecha);
    if (!libres.some((h) => h.hora === datos.hora && h.disponible)) {
      throw errorPublico(409, 'Ese horario se acaba de ocupar. Elegí otro, por favor.');
    }
    const turno = await principal.reservar(datos);
    // Desde acá el turno YA está reservado: nada puede hacer fallar la respuesta (si no, la persona
    // reintentaría y quedaría un turno doble). Lo que no se pueda bloquear lo completa reconciliar().
    try {
      await propagar(principal.id, String(turno.id), { fecha: datos.fecha, hora: datos.hora, duracionMin });
    } catch (e) {
      log.error(`Turno ${turno.id} reservado, pero no se pudo registrar el bloqueo: ${e.message}`);
    }
    return { ...turno, id: String(turno.id), sistema: principal.id };
  }

  async function cancelar(sistemaId, turnoId) {
    const sistema = porId.get(sistemaId);
    if (!sistema) throw new Error(`Sistema desconocido: ${sistemaId}`);
    await sistema.cancelar(turnoId);
    try {
      await liberar(sistemaId, String(turnoId));
    } catch (e) {
      log.error(`Turno ${turnoId} cancelado, pero no se pudieron liberar sus bloqueos: ${e.message}`);
    }
  }

  /**
   * Aviso de un sistema (webhook): { tipo: 'reserva' | 'cancelacion', id, fecha, hora, duracionMin }.
   * Los avisos sobre nuestros propios "ocupado" se ignoran (si no, se armaría un bucle).
   */
  async function procesarAviso(sistemaId, aviso) {
    if (!porId.has(sistemaId) || !aviso?.id) return { ignorado: true };
    const id = String(aviso.id);
    if (await registro.esBloqueo(sistemaId, id)) return { ignorado: true };
    if (aviso.tipo === 'cancelacion') return { liberados: await liberar(sistemaId, id) };
    if (aviso.tipo === 'reserva') return { creados: await propagar(sistemaId, id, aviso) };
    return { ignorado: true };
  }

  /**
   * Revisión periódica: cubre avisos perdidos y reintenta lo pendiente.
   * - Todo turno vigente de cada sistema tiene que estar "ocupado" en los demás.
   * - Todo "ocupado" cuyo turno ya no existe se saca.
   * Si un sistema no responde, no se tocan sus bloqueos (no se sabe si sus turnos siguen).
   */
  async function reconciliar(desde, hasta) {
    const resumen = { creados: 0, liberados: 0, errores: [] };
    const vigentes = new Map();
    for (const s of sistemas) {
      try {
        const nuestros = new Set((await registro.enDestino(s.id)).map((r) => r.bloqueo_id).filter(Boolean));
        const propios = (await s.turnos(desde, hasta)).filter((t) => !nuestros.has(String(t.id)));
        vigentes.set(s.id, new Set(propios.map((t) => String(t.id))));
        for (const t of propios) resumen.creados += await propagar(s.id, String(t.id), t);
      } catch (e) {
        resumen.errores.push(`${s.nombre}: ${e.message}`);
      }
    }
    for (const reg of await registro.activos(desde)) {
      const vivos = vigentes.get(reg.origen_sistema);
      if (vivos && !vivos.has(reg.origen_id) && reg.fecha <= hasta) {
        resumen.liberados += await liberar(reg.origen_sistema, reg.origen_id);
      }
    }
    resumen.pendientes = (await registro.activos(desde)).filter((r) => !r.bloqueo_id || r.error).length;
    return resumen;
  }

  return { disponibilidad, reservar, cancelar, procesarAviso, reconciliar, principal, sistemas };
}
