// Imágenes del sitio desde el panel: subir una foto, que se convierta a WebP y se vea en el inicio; volver a la original.
import { join } from 'node:path';
import { abrir, borrarUsuario, resultados, supabaseAdmin, usuarioTemporal } from './comun.mjs';

const FOTO = join(import.meta.dirname, '..', '..', 'public', 'img', 'og.png'); // PNG de 1200×630 como foto de prueba

export default async function imagenes() {
  const r = resultados('Imágenes del sitio');
  const db = supabaseAdmin();
  const { data: antes } = await db.from('ajustes').select('imagen_retrato').single();
  if (antes?.imagen_retrato) {
    console.log('    (la foto de la portada ya está personalizada: no se prueba para no pisarla)');
    return r.fallas;
  }
  const adm = await usuarioTemporal(db, { admin: true, nombre: 'Admin Prueba' });
  const { browser, page, errores, ir, esperar, clic, ingresar } = await abrir();
  try {
    await ingresar(adm, '/admin/imagenes');
    r.ok(await esperar('Foto de la portada'), 'abre Panel → Imágenes');
    const input = await page.waitForSelector('input[type="file"]');
    await input.uploadFile(FOTO);
    r.ok(await esperar('Listo: ya se ve en el sitio', 30000), 'sube la foto');

    const { data: subida } = await db.from('ajustes').select('imagen_retrato').single();
    const url = subida?.imagen_retrato || '';
    r.ok(/\/object\/public\/sitio\/retrato-\d+\.webp$/.test(url), 'se guarda como WebP en el bucket "sitio"');
    const res = await fetch(url);
    r.ok(res.ok && res.headers.get('content-type') === 'image/webp', 'la imagen pública responde como WebP');

    await ir('/');
    const src = await page.evaluate(() => document.querySelector('main img').getAttribute('src'));
    r.ok(src === url, 'el inicio muestra la foto nueva');

    await ir('/admin/imagenes');
    await clic('Volver a la original');
    r.ok(await esperar('volvió la foto original'), 'vuelve a la original');
    const { data: despues } = await db.from('ajustes').select('imagen_retrato').single();
    r.ok(despues.imagen_retrato === null, 'la base queda sin foto personalizada');
    const { data: archivos } = await db.storage.from('sitio').list('', { search: 'retrato-' });
    r.ok((archivos || []).length === 0, 'se borra el archivo subido');
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
    await db.from('ajustes').update({ imagen_retrato: null }).eq('id', true);
    const { data: restos } = await db.storage.from('sitio').list('', { search: 'retrato-' });
    if (restos?.length) await db.storage.from('sitio').remove(restos.map((f) => f.name));
    await borrarUsuario(db, adm.id);
  }
  return r.fallas;
}
