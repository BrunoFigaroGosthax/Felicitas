// Sitio público: todas las páginas cargan en celular y escritorio sin desbordar; vista previa y sitemap.
import { join } from 'node:path';
import { abrir, API, CAPTURAS, pedir, resultados } from './comun.mjs';

const RUTAS = ['/', '/turnos', '/cursos', '/cursos/adolescencia-estar-cerca', '/cursos/fiebre-que-hago', '/ingresar', '/crear-cuenta',
  '/recuperar', '/certificados', '/privacidad', '/terminos', '/arrepentimiento', '/pago/resultado?estado=aprobado&curso=primeros-meses', '/no-existe'];

export default async function publico() {
  const r = resultados('Sitio público');
  const { browser, page, errores, ir } = await abrir();
  try {
    for (const ancho of [390, 1280]) {
      await page.setViewport({ width: ancho, height: 900 });
      for (const ruta of RUTAS) {
        await ir(ruta);
        const { desborde, largo } = await page.evaluate(() => ({
          desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          largo: document.querySelector('main')?.innerText.trim().length || 0,
        }));
        r.ok(desborde <= 0 && largo > 20, `${ancho}px ${ruta}${desborde > 0 ? ` (desborda ${desborde}px)` : ''}${largo <= 20 ? ' (vacía)' : ''}`);
        await page.screenshot({ path: join(CAPTURAS, `publico-${ancho}-${ruta.replace(/[/?=&]+/g, '_') || 'home'}.png`), fullPage: true });
      }
    }
    r.ok((await page.title()) === 'Página no encontrada · Felicitas', 'la 404 tiene su título');
    await ir('/mi-cuenta');
    r.ok(page.url().includes('/ingresar?volver=%2Fmi-cuenta'), 'Mi cuenta sin sesión → ingresar');

    const curso = await (await pedir(`${API}/cursos/fiebre-que-hago`)).text();
    r.ok(curso.includes('<title>Mi hijo tiene fiebre, ¿qué hago? · Felicitas</title>') && curso.includes('og:description'), 'vista previa del curso armada con la base');
    const sitemap = await (await pedir(`${API}/sitemap.xml`)).text();
    r.ok(sitemap.includes('/cursos/alimentacion-complementaria'), 'sitemap con los cursos de la base');
    r.ok(errores.length === 0, `sin errores en la página${errores.length ? `: ${errores[0]}` : ''}`);
  } finally {
    await browser.close();
  }
  return r.fallas;
}
