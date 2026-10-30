// Contenido de la doctora: contacto, sedes, obras sociales, reseñas de Google (simuladas) y turnos de martes.
import { join } from 'node:path';
import { abrir, CAPTURAS, resultados } from './comun.mjs';

const RESENAS = {
  disponible: true,
  puntaje: 4.9,
  total: 37,
  verTodas: 'https://maps.google.com/?cid=1',
  escribir: 'https://search.google.com/local/writereview?placeid=X',
  resenas: [
    { autor: 'Laura Pérez', autorUrl: 'https://g.co/u/1', estrellas: 5, texto: 'Reseña de prueba uno.', cuando: 'hace 2 semanas', url: null },
    { autor: 'Martín Gómez', autorUrl: null, estrellas: 4, texto: 'Reseña de prueba dos.', cuando: 'hace un mes', url: null },
    { autor: 'Ana', autorUrl: null, estrellas: 5, texto: 'Reseña de prueba tres.', cuando: 'hace 3 meses', url: null },
  ],
};

export default async function contenido() {
  const r = resultados('Datos de la doctora, sedes, obras sociales, reseñas y turnos');
  const { browser, page, errores, ir, texto, completar, clic } = await abrir();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().endsWith('/api/resenas')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(RESENAS) });
    req.continue();
  });
  try {
    await ir('/');
    const t = await texto();
    r.ok(t.includes('Felicitas Pino Meneses') && t.includes('MP NQN 5643'), 'nombre completo y matrícula');
    r.ok(t.includes('basada en la evidencia científica'), '"Sobre mí" con el texto de la doctora');
    r.ok(t.includes('Entre Ríos 1152') && t.includes('Mendoza 125') && t.includes('Martes de 17 a 21 h'), 'las dos sedes con dirección y horarios');
    r.ok(t.includes('35 en CIEV, y particulares'), 'cantidad de obras sociales');
    const enlaces = await page.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.href));
    r.ok(enlaces.includes('https://wa.me/5492994624870'), 'WhatsApp real');
    r.ok(enlaces.includes('https://instagram.com/dra.felicitas.pediatra'), 'Instagram real');
    r.ok(enlaces.includes('mailto:dra.felicitaspino@gmail.com'), 'email real');
    r.ok(enlaces.includes('https://appsindicatopetroleros.org/#/home'), 'link a Mi Sindicato para OSPEPRI');
    r.ok(t.includes('4,9') && t.includes('37 reseñas en Google') && t.includes('Reseña de prueba dos.'), 'reseñas de Google con puntaje y textos');
    r.ok(enlaces.includes('https://search.google.com/local/writereview?placeid=X'), 'botón para dejar una reseña');
    const fotos = await page.evaluate(() => [...document.querySelectorAll('#opiniones img')].length);
    r.ok(fotos === 0, 'sin fotos de los autores (el navegador no se conecta a Google)');
    await page.evaluate(() => document.querySelector('#donde').scrollIntoView());
    await page.screenshot({ path: join(CAPTURAS, 'contenido-home.png'), fullPage: true });

    await ir('/turnos');
    r.ok((await texto()).includes('Turnos en CIEV (Entre Ríos 1152, Neuquén), martes de 17 a 21 h'), 'turnos: aclara sede y horario');
    await completar('Obra social', 'OSPEPRI');
    r.ok((await texto()).includes('app Mi Sindicato'), 'turnos: con OSPEPRI avisa de los Consultorios OSPEPRI');
    await completar('Nombre y apellido del niño', 'Prueba');
    await completar('Fecha de nacimiento', '2020-01-01');
    await completar('Adulto responsable', 'Prueba');
    await completar('WhatsApp', '299 111 1111');
    await completar('Email', 'prueba@example.com');
    await completar('Acepto', true);
    await clic('Continuar');
    await clic('Control de salud');
    await clic('Continuar');
    await page.waitForSelector('[aria-label="Día"] [role="radio"]');
    const dias = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Día"] [role="radio"]')].map((b) => b.getAttribute('aria-label')));
    r.ok(dias.length === 5 && dias.every((d) => d.startsWith('Martes')), `el calendario ofrece solo martes (${dias[0]}…)`);
    await page.evaluate(() => document.querySelector('[aria-label="Día"] [role="radio"]').click());
    await page.waitForSelector('[aria-label="Horario"] [role="radio"]', { timeout: 15000 });
    const horas = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Horario"] [role="radio"]')].map((b) => b.innerText.trim()));
    r.ok(horas[0] === '17:00' && horas.at(-1) === '20:30', `horarios de 17 a 21 h (${horas.join(', ')})`);
    await page.screenshot({ path: join(CAPTURAS, 'contenido-turnos.png'), fullPage: true });
    r.ok(errores.length === 0, `sin errores en la página${errores.length ? `: ${errores[0]}` : ''}`);
  } finally {
    await browser.close();
  }
  return r.fallas;
}
