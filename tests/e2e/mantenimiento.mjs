// Modo mantenimiento desde el panel: el admin lo activa, el público ve el aviso, el admin lo vuelve a abrir.
// Ojo: pone el sitio real en mantenimiento unos segundos (la base es la misma). Al terminar lo deja abierto.
import { abrir, borrarUsuario, resultados, supabaseAdmin, usuarioTemporal, WEB } from './comun.mjs';

const MENSAJE = 'Prueba automática: volvemos enseguida.';

export default async function mantenimiento() {
  const r = resultados('Modo mantenimiento');
  const db = supabaseAdmin();
  const estado = async () => (await db.from('ajustes').select('mantenimiento, mensaje').single()).data;
  const antes = await estado();
  if (antes?.mantenimiento) {
    console.log('    (el sitio ya está en mantenimiento: no se prueba para no abrirlo)');
    return r.fallas;
  }
  const adm = await usuarioTemporal(db, { admin: true, nombre: 'Admin Prueba' });
  const { browser, errores, ir, esperar, clic, completar, ingresar } = await abrir();
  try {
    await ingresar(adm, '/admin');
    r.ok(await esperar('El sitio está abierto al público'), 'el panel muestra el sitio abierto');

    await clic('Poner en mantenimiento');
    await completar('Mensaje para el público', MENSAJE);
    await clic('Poner en mantenimiento');
    r.ok(await esperar('En mantenimiento'), 'el panel pasa a "En mantenimiento"');
    const cerrado = await estado();
    r.ok(cerrado.mantenimiento === true && cerrado.mensaje === MENSAJE, 'queda guardado en la base con el mensaje');

    await ir('/');
    r.ok(await esperar('Sitio en mantenimiento'), 'el admin ve el sitio con la franja de aviso');

    // Visitante sin cuenta, en otra ventana.
    const contexto = await (browser.createBrowserContext?.() ?? browser.createIncognitoBrowserContext());
    const anonima = await contexto.newPage();
    await anonima.goto(`${WEB}/cursos`, { waitUntil: 'networkidle0' });
    const visto = await anonima.evaluate(() => document.body.innerText);
    r.ok(visto.includes('Estamos actualizando la página') && visto.includes(MENSAJE), 'el público ve el aviso con el mensaje');
    r.ok(!visto.includes('Pedir turno'), 'el aviso no muestra el menú del sitio');
    await anonima.goto(`${WEB}/ingresar`, { waitUntil: 'networkidle0' });
    r.ok((await anonima.evaluate(() => document.body.innerText)).includes('Ingresá a tu cuenta'), 'el ingreso sigue abierto');
    await contexto.close();

    await ir('/admin');
    await clic('Abrir el sitio');
    r.ok(await esperar('El sitio está abierto al público'), 'el admin vuelve a abrir el sitio');
    r.ok((await estado()).mantenimiento === false, 'queda abierto en la base');
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
    await db.from('ajustes').update({ mantenimiento: false, mensaje: antes?.mensaje ?? null }).eq('id', true);
    await borrarUsuario(db, adm.id);
  }
  return r.fallas;
}
