// Textos del sitio desde el panel: cambiar el título de la portada y el WhatsApp, verlos en el sitio y volver a los originales.
import { abrir, borrarUsuario, resultados, supabaseAdmin, usuarioTemporal } from './comun.mjs';

const TITULO = 'Prueba automática de título';

export default async function textos() {
  const r = resultados('Textos del sitio');
  const db = supabaseAdmin();
  const leer = async () => (await db.from('ajustes').select('textos').single()).data?.textos;
  const antes = await leer();
  if (antes && Object.keys(antes).length) {
    console.log('    (ya hay textos modificados desde el panel: no se prueba para no pisarlos)');
    return r.fallas;
  }
  const adm = await usuarioTemporal(db, { admin: true, nombre: 'Admin Prueba' });
  const { browser, page, errores, ir, esperar, completar, ingresar } = await abrir();
  // Hace clic en un botón del formulario que contiene el campo `label` (hay varios "Guardar" en la página).
  const enFormulario = (label, boton) =>
    page.evaluate(
      (label, boton) => {
        const l = [...document.querySelectorAll('main label')].find((x) => x.textContent.trim().startsWith(label));
        [...l.closest('form').querySelectorAll('button')].find((b) => b.innerText.trim().startsWith(boton)).click();
      },
      label,
      boton,
    );
  // Espera un texto dentro del formulario que contiene el campo `label`.
  const esperarEn = (label, texto) =>
    page
      .waitForFunction(
        (label, texto) => {
          const l = [...document.querySelectorAll('main label')].find((x) => x.textContent.trim().startsWith(label));
          return l?.closest('form').innerText.includes(texto);
        },
        { timeout: 15000 },
        label,
        texto,
      )
      .then(() => true, () => false);
  try {
    await ingresar(adm, '/admin/textos');
    r.ok(await esperar('Título de la portada'), 'abre Panel → Textos');

    await completar('Título de la portada', TITULO);
    await enFormulario('Título de la portada', 'Guardar');
    r.ok(await esperarEn('Título de la portada', 'Listo: ya se ve en el sitio'), 'guarda el título');

    await completar('WhatsApp', '123');
    await enFormulario('WhatsApp', 'Guardar');
    r.ok(await esperar('Revisá el número'), 'avisa si el WhatsApp está mal');
    await completar('WhatsApp', '299 111-2222');
    await enFormulario('WhatsApp', 'Guardar');
    r.ok(await esperarEn('WhatsApp', 'Listo: ya se ve en el sitio'), 'guarda el WhatsApp');
    const guardado = await leer();
    r.ok(
      JSON.stringify(guardado) === JSON.stringify({ inicio: { titulo: TITULO }, contacto: { whatsapp: '299 111-2222' } }),
      `en la base queda solo lo cambiado (${JSON.stringify(guardado)})`,
    );

    await ir('/');
    const h1 = await page.evaluate(() => document.querySelector('h1').innerText.trim());
    r.ok(h1 === TITULO, 'el inicio muestra el título nuevo');
    const wa = await page.evaluate(() => [...document.querySelectorAll('footer a')].find((a) => a.innerText.includes('WhatsApp'))?.href);
    r.ok(wa === 'https://wa.me/5492991112222', 'el pie usa el WhatsApp nuevo');

    await ir('/admin/textos');
    await enFormulario('Título de la portada', 'Volver a los originales');
    r.ok(await esperarEn('Título de la portada', 'volvieron los textos originales'), 'el inicio vuelve a los originales');
    await enFormulario('WhatsApp', 'Volver a los originales');
    r.ok(await esperarEn('WhatsApp', 'volvieron los textos originales'), 'el contacto vuelve a los originales');
    r.ok(JSON.stringify(await leer()) === '{}', 'la base queda sin textos modificados');
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
    await db.from('ajustes').update({ textos: antes ?? {} }).eq('id', true);
    await borrarUsuario(db, adm.id);
  }
  return r.fallas;
}
