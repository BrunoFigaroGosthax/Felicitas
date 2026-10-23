// Retomar el video: con un reproductor simulado que habla Player.js como el de Bunny (no necesita Bunny).
import { abrir, resultados } from './comun.mjs';

const REPRODUCTOR = `<!doctype html><html><body style="margin:0;background:#222;color:#fff;font:20px sans-serif">reproductor de prueba<script>
window.recibidos = [];
let seg = 0, timer = null;
const enviar = (event, value) => parent.postMessage(JSON.stringify({ context: 'player.js', version: '0.0.11', event, value }), '*');
addEventListener('message', (e) => { const d = JSON.parse(e.data); window.recibidos.push(d); if (d.method === 'setCurrentTime') seg = d.value; });
window.reproducir = (hasta) => { timer = setInterval(() => { seg += 1; enviar('timeupdate', { seconds: seg, duration: 120 }); if (seg >= hasta) { clearInterval(timer); enviar('pause'); } }, 20); };
window.terminar = () => enviar('ended');
setTimeout(() => enviar('ready', {}), 200);
</script></body></html>`;

export default async function video() {
  const r = resultados('Retomar el video (reproductor simulado)');
  const { browser, page, errores, ir, texto } = await abrir();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('https://iframe.mediadelivery.net/')) return req.respond({ status: 200, contentType: 'text/html', body: REPRODUCTOR });
    if (/\/api\/clases\/[^/]+\/medio/.test(u)) {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ video: 'https://iframe.mediadelivery.net/embed/1/abc?token=x&expires=1', pdf: null, material: null }) });
    }
    req.continue();
  });
  const marco = () => page.frames().find((f) => f.url().startsWith('https://iframe.mediadelivery.net/'));
  const pausa = (ms) => new Promise((x) => setTimeout(x, ms));
  try {
    await ir('/cursos/guardia-o-consultorio');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await pausa(800);
    let f = marco();
    r.ok(Boolean(f), 'muestra el reproductor');
    await f.evaluate(() => window.reproducir(47));
    await pausa(2000);
    const pos = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('felicitas:posicion:guardia-o-consultorio') || '{}'))[0]);
    r.ok(pos === 47, `guarda el minuto al pausar (${pos} s)`);
    await page.reload({ waitUntil: 'networkidle0' });
    await pausa(1000);
    f = marco();
    const seek = await f.evaluate(() => window.recibidos.find((d) => d.method === 'setCurrentTime')?.value);
    r.ok(seek === 47, `al volver retoma donde quedó (${seek} s)`);
    r.ok((await texto()).includes('Retomás desde el minuto 0:47'), 'avisa desde qué minuto retoma');
    await f.evaluate(() => window.terminar());
    await pausa(800);
    r.ok((await texto()).includes('1 de 1'), 'al terminar, la clase queda vista sola');
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
  }
  return r.fallas;
}
