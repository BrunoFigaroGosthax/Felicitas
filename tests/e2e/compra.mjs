// Compra con cupón y pago de demostración (requiere PAGOS_DEMO=true en el servidor probado).
import { join } from 'node:path';
import { abrir, borrarUsuario, CAPTURAS, resultados, supabaseAdmin, usuarioTemporal } from './comun.mjs';

export default async function compra() {
  const r = resultados('Compra con pago de demostración');
  const db = supabaseAdmin();
  const u = await usuarioTemporal(db, { nombre: 'Prueba Compra' });
  const { browser, page, errores, esperar, clic, completar, ingresar } = await abrir();
  try {
    await ingresar(u, '/cursos/primeros-meses');
    const { data: curso } = await db.from('cursos').select('precio').eq('slug', 'primeros-meses').single();
    const precio = Number(curso.precio);
    r.ok(await esperar('Comprar curso'), 'curso pago con botón de compra');
    await clic('¿Tenés un código de descuento?');
    await completar('Código de descuento', 'PRUEBA10');
    await clic('Aplicar');
    r.ok(await esperar('Código aplicado: 10 %'), 'aplica el cupón PRUEBA10');
    await clic('Comprar curso');
    const demo = await page.waitForFunction(() => location.pathname === '/pago/demo', { timeout: 15000 }).then(() => true, () => false);
    r.ok(demo, 'va al pago de demostración (si falla: ¿PAGOS_DEMO=true en el servidor?)');
    if (demo) {
      r.ok(await esperar('no se piden datos de tarjeta'), 'avisa que no se cobra nada');
      await page.screenshot({ path: join(CAPTURAS, 'compra-demo.png'), fullPage: true });
      await clic('Simular pago aprobado');
      r.ok(await esperar('Ya tenés el curso'), 'pago aprobado');
      const { data: c } = await db.from('compras').select('*').eq('usuario_id', u.id).single();
      r.ok(c?.estado === 'aprobada' && c.proveedor === 'demo' && Number(c.monto) === precio * 0.9, 'compra aprobada, marcada demo y con 10 % de descuento');
      const { data: a } = await db.from('accesos').select('*').eq('usuario_id', u.id);
      r.ok(a?.length === 1 && !a[0].revocado_at, 'el curso quedó habilitado');
      await clic('Ir al curso');
      r.ok(await esperar('Tu progreso'), 'el curso se ve completo');
    }
    r.ok(errores.length === 0, 'sin errores en la página');
  } finally {
    await browser.close();
    await borrarUsuario(db, u.id);
  }
  return r.fallas;
}
