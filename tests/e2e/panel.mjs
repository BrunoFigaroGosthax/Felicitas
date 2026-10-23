// Panel de administración: acceso, crear un curso con una clase y su PDF, borrarlo, y todas las secciones.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrir, borrarUsuario, CAPTURAS, resultados, supabaseAdmin, usuarioTemporal } from './comun.mjs';

const PDF = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
const TITULO = 'Curso de prueba del panel';
const SLUG = 'curso-de-prueba-del-panel';

export default async function panel() {
  const r = resultados('Panel de administración');
  const db = supabaseAdmin();
  const adm = await usuarioTemporal(db, { admin: true, nombre: 'Admin Prueba' });
  const pdf = join(CAPTURAS, 'material-prueba.pdf');
  writeFileSync(pdf, PDF);
  const { browser, page, errores, ir, texto, esperar, clic, completar, ingresar } = await abrir();
  try {
    await ingresar(adm, '/admin');
    r.ok(await esperar('Nuevo curso'), 'ingresa y abre el panel');
    const nav = await page.evaluate(() => document.querySelector('header nav').innerText);
    r.ok(nav.includes('Panel') && !nav.includes('Mi cuenta'), 'el encabezado del admin muestra solo "Panel"');

    await clic('Nuevo curso');
    await completar('Título', TITULO);
    await completar('Resumen', 'Temporal, se borra solo.');
    await completar('Precio en pesos', '12500');
    await clic('Crear curso');
    r.ok(await esperar('Clases (0)'), 'crea el curso');
    await completar('Título', 'Guía de prueba', 'form.border-dashed');
    await completar('Tipo', 'pdf', 'form.border-dashed');
    await clic('Agregar');
    r.ok(await esperar('Clases (1)'), 'agrega una clase');
    const input = await page.waitForSelector('input[type="file"][accept="application/pdf"]');
    await input.uploadFile(pdf);
    r.ok(await esperar('Cargado'), 'sube el PDF');
    await ir('/admin/cursos');
    r.ok(await esperar(TITULO), 'aparece en el listado');
    await clic(TITULO);
    await clic('Borrar curso');
    await page.waitForFunction(() => location.pathname === '/admin/cursos', { timeout: 15000 }).catch(() => {});
    r.ok(!(await texto()).includes(TITULO), 'borra el curso');
    const { data: archivos } = await db.storage.from('materiales').list(`cursos/${SLUG}`);
    r.ok((archivos || []).length === 0, 'al borrar el curso se borra su PDF');

    for (const s of ['ventas', 'alumnos', 'cupones', 'turnos', 'arrepentimientos', 'contenido', 'cuenta']) {
      await ir(`/admin/${s}`);
      await new Promise((x) => setTimeout(x, 600));
      const t = await page.evaluate(() => document.querySelector('main').innerText);
      r.ok(!/No pudimos|No tenés permiso|no tiene permiso/.test(t), `sección ${s} carga`);
    }
    r.ok((await texto()).includes('Cerrar sesión') && (await texto()).includes('Cambiar contraseña'), 'Mis datos: contraseña y cerrar sesión dentro del panel');
    await page.screenshot({ path: join(CAPTURAS, 'panel-mis-datos.png'), fullPage: true });
    await ir('/mi-cuenta');
    r.ok(await esperar('Tu cuenta es administradora'), 'Mi cuenta avisa que es administradora');
    r.ok(!(await texto()).includes('Mis certificados'), 'Mi cuenta del admin oculta cursos y certificados vacíos');
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
    const { data: restos } = await db.from('cursos').select('id').like('slug', `${SLUG}%`);
    for (const c of restos || []) await db.from('cursos').delete().eq('id', c.id);
    const { data: arch } = await db.storage.from('materiales').list(`cursos/${SLUG}`);
    if (arch?.length) await db.storage.from('materiales').remove(arch.map((f) => `cursos/${SLUG}/${f.name}`));
    await borrarUsuario(db, adm.id);
  }
  return r.fallas;
}
