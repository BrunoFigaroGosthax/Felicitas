// Turnos: reservar (con DrApp de ejemplo) y cancelar con el link del email.
// El link se firma con la clave del servidor: la parte de cancelación solo corre en local
// (o si E2E_TOKEN_SECRET tiene el mismo TOKEN_SECRET que el servidor probado).
import { join } from 'node:path';
import { abrir, API, CAPTURAS, LOCAL, pedir as pedirApi, resultados, supabaseAdmin } from './comun.mjs';

export default async function turnos() {
  const r = resultados('Turnos: reservar y cancelar con el link');
  const db = supabaseAdmin();
  if (process.env.E2E_TOKEN_SECRET) process.env.TOKEN_SECRET = process.env.E2E_TOKEN_SECRET;
  const { tokenTurno } = await import('../../server/lib/tokens.js');

  const dias = [];
  for (let d = new Date(Date.now() + 864e5); dias.length < 3; d = new Date(d.getTime() + 864e5)) if (d.getDay() % 6) dias.push(d.toISOString().slice(0, 10));
  const fecha = dias[2];
  const { horarios } = await (await pedirApi(`${API}/api/turnos/disponibilidad?fecha=${fecha}`)).json();
  const hora = horarios.find((h) => h.disponible).hora;
  const ocupada = horarios.find((h) => !h.disponible)?.hora;
  const datos = { paciente: 'Prueba', nacimiento: '2020-01-01', responsable: `Prueba E2E ${Date.now()}`, telefono: '11 1111 1111', email: 'prueba@example.com', obraSocial: 'Particular', motivo: 'control', fecha, consentimiento: '2026-10' };
  const pedir = (h) => pedirApi(`${API}/api/turnos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...datos, hora: h }) });

  let turnoId;
  const { browser, page, errores, ir, texto, esperar } = await abrir();
  try {
    if (ocupada) r.ok((await pedir(ocupada)).status === 409, 'un horario ocupado se rechaza (409)');
    r.ok((await pedir(hora)).status === 201, 'reserva un horario libre');
    const { data: fila } = await db.from('turnos').select('*').eq('responsable_nombre', datos.responsable).maybeSingle();
    turnoId = fila?.id;
    r.ok(fila?.sistema === 'drapp' && Boolean(fila?.externo_id), 'queda registrado con su sistema y su id externo');

    if (!LOCAL && !process.env.E2E_TOKEN_SECRET) {
      console.log('  (cancelación con link: se omite fuera de local sin E2E_TOKEN_SECRET)');
    } else if (turnoId) {
      await ir(`/turnos/cancelar?t=${encodeURIComponent(tokenTurno(turnoId))}`);
      r.ok(await esperar('Sí, cancelar turno'), 'el link muestra el turno');
      r.ok((await texto()).includes(`a las ${hora}`), 'con su día y hora');
      await page.screenshot({ path: join(CAPTURAS, 'turno-cancelar.png'), fullPage: true });
      await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.innerText.includes('Sí, cancelar')).click());
      r.ok(await esperar('Turno cancelado'), 'lo cancela');
      const { data: despues } = await db.from('turnos').select('estado').eq('id', turnoId).single();
      r.ok(despues.estado === 'cancelado', 'queda cancelado en la base');
      await ir(`/turnos/cancelar?t=${encodeURIComponent(`${tokenTurno(turnoId).slice(0, -2)}xx`)}`);
      r.ok(await esperar('El link no es válido'), 'un link alterado no sirve');
    }
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
    await db.from('turnos').delete().eq('responsable_nombre', datos.responsable);
  }
  return r.fallas;
}
