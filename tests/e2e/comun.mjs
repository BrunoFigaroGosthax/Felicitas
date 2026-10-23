// Herramientas compartidas de las pruebas de navegador (npm run test:e2e).
// Usan el Chrome o Edge instalado (puppeteer-core) y el Supabase de server/.env para crear y borrar
// usuarios temporales (@example.com). Nunca dejan datos: cada prueba limpia lo que crea.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer-core';

export const WEB = (process.env.E2E_URL || 'http://localhost:5173').replace(/\/$/, '');
export const LOCAL = WEB.startsWith('http://localhost');
/** Backend: en local corre aparte (3001); publicado, en el mismo dominio. */
export const API = (process.env.E2E_API || (LOCAL ? 'http://localhost:3001' : WEB)).replace(/\/$/, '');
export const CAPTURAS = join(dirname(fileURLToPath(import.meta.url)), 'capturas');
mkdirSync(CAPTURAS, { recursive: true });

const NAVEGADORES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

/** fetch que reintenta si el servidor no responde (en local, `--watch` puede estar reiniciándolo). */
export async function pedir(url, opciones, intentos = 8) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, opciones);
    } catch (e) {
      if (i >= intentos) throw e;
      await new Promise((r) => setTimeout(r, 750));
    }
  }
}

export function supabaseAdmin() {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: clave } = process.env;
  if (!url || !clave) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (server/.env).');
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Usuario temporal confirmado (sin enviar emails). */
export async function usuarioTemporal(db, { admin = false, nombre = 'Prueba' } = {}) {
  const email = `prueba-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const clave = `P-${Math.random().toString(36).slice(2)}!9`;
  const { data, error } = await db.auth.admin.createUser({ email, password: clave, email_confirm: true, user_metadata: { nombre } });
  if (error) throw error;
  if (admin) await db.from('perfiles').update({ rol: 'admin' }).eq('id', data.user.id);
  return { id: data.user.id, email, clave };
}

export async function borrarUsuario(db, id) {
  await db.from('certificados').delete().eq('usuario_id', id);
  await db.from('accesos').delete().eq('usuario_id', id);
  await db.from('compras').delete().eq('usuario_id', id);
  await db.auth.admin.deleteUser(id);
}

/** Abre el navegador y devuelve la página con ayudas. Los clics y campos usan el DOM (más estable que el mouse). */
export async function abrir({ ancho = 1280, alto = 1000 } = {}) {
  const ruta = NAVEGADORES.find((r) => existsSync(r));
  if (!ruta) throw new Error('No encontré Chrome ni Edge. Indicá la ruta con CHROME_PATH.');
  const browser = await puppeteer.launch({ executablePath: ruta, headless: true });
  const [page] = await browser.pages();
  await page.setViewport({ width: ancho, height: alto });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('dialog', (d) => d.accept());

  const ir = async (r) => {
    await page.goto(r.startsWith('http') ? r : WEB + r, { waitUntil: 'networkidle0' });
    await new Promise((x) => setTimeout(x, 300));
  };
  const texto = () => page.evaluate(() => document.body.innerText);
  const esperar = (t, ms = 15000) => page.waitForFunction((x) => document.body.innerText.includes(x), { timeout: ms }, t).then(() => true, () => false);
  const clic = async (t, dentro = 'main') => {
    await page.waitForFunction(
      (t, d) => [...document.querySelector(d).querySelectorAll('button, a, [role="radio"]')].some((e) => e.innerText.trim().startsWith(t) && !e.disabled),
      { timeout: 15000 },
      t,
      dentro,
    );
    await page.evaluate(
      (t, d) => [...document.querySelector(d).querySelectorAll('button, a, [role="radio"]')].find((e) => e.innerText.trim().startsWith(t) && !e.disabled).click(),
      t,
      dentro,
    );
    await new Promise((x) => setTimeout(x, 100));
  };
  /** Completa un campo por el texto de su <label> (funciona con inputs controlados de React). */
  const completar = async (label, valor, dentro = 'main') => {
    await page.waitForFunction((l, d) => [...document.querySelector(d).querySelectorAll('label')].some((x) => x.textContent.trim().startsWith(l)), { timeout: 15000 }, label, dentro);
    await page.evaluate(
      (label, valor, d) => {
        const l = [...document.querySelector(d).querySelectorAll('label')].find((x) => x.textContent.trim().startsWith(label));
        const el = document.getElementById(l.htmlFor);
        if (el.type === 'checkbox') {
          if (el.checked !== valor) el.click();
          return;
        }
        const proto = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, valor);
        el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      },
      label,
      valor,
      dentro,
    );
  };
  const ingresar = async (u, volver = '/') => {
    await ir(`/ingresar?volver=${encodeURIComponent(volver)}`);
    await completar('Email', u.email);
    await completar('Contraseña', u.clave);
    await clic('Ingresar');
    await page.waitForFunction((v) => location.pathname === v.split('?')[0], { timeout: 15000 }, volver).catch(() => {});
  };
  return { browser, page, errores, ir, texto, esperar, clic, completar, ingresar };
}

/** Registro de resultados de una prueba. */
export function resultados(nombre) {
  let fallas = 0;
  console.log(`\n▶ ${nombre}`);
  return {
    ok(cond, desc) {
      if (!cond) fallas++;
      console.log(`  ${cond ? 'PASA' : 'FALLA'}  ${desc}`);
    },
    get fallas() {
      return fallas;
    },
  };
}
