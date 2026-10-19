// Prueba del esquema de Supabase: corre todas las migraciones y el seed en un Postgres en memoria
// (PGlite) y verifica permisos (RLS), triggers y funciones. Uso: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirMigraciones = join(raiz, 'migrations');
const migraciones = readdirSync(dirMigraciones).filter((f) => f.endsWith('.sql')).sort();
const seed = readFileSync(join(raiz, 'seed.sql'), 'utf8');
const db = new PGlite();

// Simulación mínima de Supabase: esquema auth, auth.uid() leyendo el JWT, roles y permisos por defecto.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}', email text, created_at timestamptz default now());
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);

for (const m of migraciones) {
  await db.exec(readFileSync(join(dirMigraciones, m), 'utf8'));
  console.log(`OK ${m}`);
}
await db.exec(seed);
console.log('OK seed');

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${A}', '{"nombre":"Ana"}'), ('${B}', '{}');`);

let fallas = 0;
async function como(rol, sub, sql) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${rol};`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('reset role;');
  }
}
async function espera(nombre, fn, check) {
  let res, err;
  try { res = await fn(); } catch (e) { err = e; }
  let ok;
  try { ok = check(res, err); } catch { ok = false; }
  if (!ok) fallas++;
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${nombre}${err ? `  [${err.message}]` : ''}`);
}
const id = async (sql) => (await db.query(sql)).rows[0].id;

const muestra = await id(`select cl.id from clases cl join cursos c on c.id = cl.curso_id where c.slug = 'adolescencia-estar-cerca' and cl.muestra`);
const paga = await id(`select cl.id from clases cl join cursos c on c.id = cl.curso_id where c.slug = 'adolescencia-estar-cerca' and cl.slug = 'hablar'`);
const gratis = await id(`select cl.id from clases cl join cursos c on c.id = cl.curso_id where c.slug = 'fiebre-que-hago'`);
const cursoPago = await id(`select id from cursos where slug = 'adolescencia-estar-cerca'`);

await espera('perfil creado al registrarse, con nombre', () => db.query(`select nombre from perfiles where id = '${A}'`), (r) => r.rows[0]?.nombre === 'Ana');
await espera('anon ve los 6 cursos', () => como('anon', null, 'select * from cursos'), (r) => r?.rows.length === 6);
await espera('anon ve las 16 clases', () => como('anon', null, 'select * from clases'), (r) => r?.rows.length === 16);
await espera('anon NO lee clases_medios', () => como('anon', null, 'select * from clases_medios'), (r, e) => !!e);
await espera('usuario NO lee clases_medios', () => como('authenticated', A, 'select * from clases_medios'), (r, e) => !!e || r.rows.length === 0);
await espera('usuario NO lee eventos_pago', () => como('authenticated', A, 'select * from eventos_pago'), (r, e) => !!e);
await espera('usuario ve solo su perfil', () => como('authenticated', A, 'select * from perfiles'), (r) => r?.rows.length === 1);
await espera('usuario edita su nombre', () => como('authenticated', A, `update perfiles set nombre = 'Ana P' where id = '${A}' returning id`), (r) => r?.rows.length === 1);
await espera('usuario NO se hace admin', () => como('authenticated', A, `update perfiles set rol = 'admin' where id = '${A}'`), (r, e) => !!e);
await espera('usuario NO edita perfil ajeno', () => como('authenticated', A, `update perfiles set nombre = 'x' where id = '${B}' returning id`), (r) => r?.rows.length === 0);
await espera('progreso en clase gratis: permitido', () => como('authenticated', A, `insert into progreso (usuario_id, clase_id) values ('${A}', '${gratis}')`), (r, e) => !e);
await espera('progreso en clase de muestra: permitido', () => como('authenticated', A, `insert into progreso (usuario_id, clase_id, completada_at) values ('${A}', '${muestra}', now())`), (r, e) => !e);
await espera('progreso en clase paga sin comprar: bloqueado', () => como('authenticated', A, `insert into progreso (usuario_id, clase_id) values ('${A}', '${paga}')`), (r, e) => !!e);
await espera('progreso a nombre de otro: bloqueado', () => como('authenticated', A, `insert into progreso (usuario_id, clase_id) values ('${B}', '${gratis}')`), (r, e) => !!e);
await espera('usuario NO crea compras', () => como('authenticated', A, `insert into compras (usuario_id, curso_id, monto) values ('${A}', '${cursoPago}', 0)`), (r, e) => !!e);
await espera('usuario NO se da accesos', () => como('authenticated', A, `insert into accesos (usuario_id, curso_id, origen) values ('${A}', '${cursoPago}', 'manual')`), (r, e) => !!e);

// Backend: compra pendiente → aprobada.
const compra = await id(`insert into compras (usuario_id, curso_id, monto, preferencia_id) values ('${A}', '${cursoPago}', 1, 'pref-1') returning id`);
await espera('compra pendiente: sin acceso', () => como('authenticated', A, `select public.tiene_acceso('${cursoPago}') as v`), (r) => r?.rows[0].v === false);
await db.query(`update compras set estado = 'aprobada', pago_id = 'pago-1' where id = '${compra}'`);
await espera('compra aprobada: aprobada_at cargado', () => db.query(`select aprobada_at from compras where id = '${compra}'`), (r) => r.rows[0].aprobada_at !== null);
await espera('compra aprobada: tiene acceso', () => como('authenticated', A, `select public.tiene_acceso('${cursoPago}') as v`), (r) => r?.rows[0].v === true);
await espera('el otro usuario sigue sin acceso', () => como('authenticated', B, `select public.tiene_acceso('${cursoPago}') as v`), (r) => r?.rows[0].v === false);
await espera('ya puede guardar progreso en clase paga', () => como('authenticated', A, `insert into progreso (usuario_id, clase_id) values ('${A}', '${paga}')`), (r, e) => !e);
await espera('ve su compra', () => como('authenticated', A, 'select * from compras'), (r) => r?.rows.length === 1);
await espera('B no ve la compra de A', () => como('authenticated', B, 'select * from compras'), (r) => r?.rows.length === 0);
await espera('progreso_por_curso: 1 de 6 completadas', () => como('authenticated', A, `select * from progreso_por_curso where curso_id = '${cursoPago}'`), (r) => r?.rows[0]?.total_clases === 6 && r.rows[0].completadas === 1);
await espera('progreso_por_curso de B: 0 completadas', () => como('authenticated', B, `select * from progreso_por_curso where curso_id = '${cursoPago}'`), (r) => r?.rows[0]?.completadas === 0);

await db.query(`update compras set estado = 'reembolsada' where id = '${compra}'`);
await espera('reembolso: acceso revocado', () => como('authenticated', A, `select public.tiene_acceso('${cursoPago}') as v`), (r) => r?.rows[0].v === false);
await espera('reembolso: no puede actualizar progreso en clase paga', () => como('authenticated', A, `update progreso set posicion_segundos = 10 where clase_id = '${paga}'`), (r, e) => !!e);
await espera('pago_id duplicado: rechazado', () => db.query(`insert into compras (usuario_id, curso_id, monto, pago_id) values ('${A}', '${cursoPago}', 1, 'pago-1')`), (r, e) => !!e);

await db.query(`update cursos set publicado = false where slug = 'primeros-meses'`);
await espera('curso despublicado: anon no lo ve', () => como('anon', null, 'select * from cursos'), (r) => r?.rows.length === 5);
await db.query(`update perfiles set rol = 'admin' where id = '${B}'`);
await espera('admin ve el curso despublicado', () => como('authenticated', B, 'select * from cursos'), (r) => r?.rows.length === 6);

await espera('turno: usuario no lo crea', () => como('authenticated', A, `insert into turnos (fecha, hora, motivo, responsable_nombre, telefono, email, consentimiento_version) values ('2026-10-20', '09:00', 'control', 'x', '1', 'a@b.c', 'v1')`), (r, e) => !!e);
await espera('turno: backend lo crea', () => db.query(`insert into turnos (usuario_id, fecha, hora, motivo, responsable_nombre, telefono, email, consentimiento_version) values ('${A}', '2026-10-20', '09:00', 'control', 'x', '1', 'a@b.c', 'v1')`), (r, e) => !e);
await espera('turno: el usuario ve el suyo', () => como('authenticated', A, 'select * from turnos'), (r) => r?.rows.length === 1);
await espera('borrar usuario: compra conservada sin usuario', async () => { await db.query(`delete from auth.users where id = '${A}'`); return db.query(`select usuario_id from compras where id = '${compra}'`); }, (r) => r?.rows[0] && r.rows[0].usuario_id === null);

// ---------------- Migración 2: cupones, certificados, testimonios, obras sociales ----------------
console.log('\n--- cupones, certificados y contenido ---');
const C = '33333333-3333-3333-3333-333333333333';
const D = '44444444-4444-4444-4444-444444444444';
await db.exec(`insert into auth.users values ('${C}', '{}'), ('${D}', '{}');`);
await db.query(`update cursos set publicado = true where slug = 'primeros-meses'`);
const curso = async (slug) => id(`select id from cursos where slug = '${slug}'`);
const alim = await curso('alimentacion-complementaria');
const meses = await curso('primeros-meses');
const fiebre = await curso('fiebre-que-hago');
const tiraError = (texto) => (r, e) => !!e && e.message.includes(texto);

await espera('anon ve 2 obras sociales', () => como('anon', null, 'select * from obras_sociales'), (r) => r?.rows.length === 2);
await espera('anon ve 3 testimonios', () => como('anon', null, 'select * from testimonios'), (r) => r?.rows.length === 3);
await db.query(`insert into testimonios (texto, autor, permiso_at) values ('borrador', 'x', current_date)`);
await db.query(`update obras_sociales set activa = false where orden = 2`);
await espera('anon no ve testimonio sin publicar', () => como('anon', null, 'select * from testimonios'), (r) => r?.rows.length === 3);
await espera('anon no ve obra social inactiva', () => como('anon', null, 'select * from obras_sociales'), (r) => r?.rows.length === 1);
await espera('usuario NO crea testimonios', () => como('authenticated', C, `insert into testimonios (texto, autor, permiso_at) values ('x','x',current_date)`), (r, e) => !!e);
await espera('anon NO lee cupones', () => como('anon', null, 'select * from cupones'), (r, e) => !!e);
await espera('usuario NO lee cupones', () => como('authenticated', C, 'select * from cupones'), (r, e) => !!e || r.rows.length === 0);
await espera('usuario NO llama crear_compra', () => como('authenticated', C, `select * from crear_compra('${C}', '${alim}')`), (r, e) => !!e);
await espera('usuario NO llama calcular_precio', () => como('authenticated', C, `select * from calcular_precio('${alim}', 'PRUEBA10')`), (r, e) => !!e);

await espera('calcular_precio con " prueba10 ": 10 % off', () => db.query(`select * from calcular_precio('${cursoPago}', ' prueba10 ', '${C}')`), (r) => Number(r.rows[0].descuento) === 0.1 && Number(r.rows[0].monto) === 0.9);
await espera('calcular_precio sin código: precio lleno', () => db.query(`select * from calcular_precio('${cursoPago}')`), (r) => Number(r.rows[0].monto) === 1 && r.rows[0].cupon_id === null);
await espera('código inexistente', () => db.query(`select * from calcular_precio('${cursoPago}', 'NOEXISTE')`), tiraError('no es válido'));
await db.query(`insert into cupones (codigo, tipo, valor, curso_id) values ('SOLOALIM', 'monto', 5, '${alim}')`);
await espera('código de otro curso', () => db.query(`select * from calcular_precio('${cursoPago}', 'SOLOALIM')`), tiraError('no es para este curso'));
await espera('descuento de monto no supera el precio', () => db.query(`select * from calcular_precio('${alim}', 'SOLOALIM')`), (r) => Number(r.rows[0].monto) === 0);
await db.query(`insert into cupones (codigo, tipo, valor, valido_hasta) values ('VENCIDO', 'porcentaje', 50, now() - interval '1 day')`);
await espera('código vencido', () => db.query(`select * from calcular_precio('${cursoPago}', 'VENCIDO')`), tiraError('ya venció'));
await espera('cupón en minúsculas: rechazado', () => db.query(`insert into cupones (codigo, tipo, valor) values ('abc', 'monto', 1)`), (r, e) => !!e);
await espera('porcentaje > 100: rechazado', () => db.query(`insert into cupones (codigo, tipo, valor) values ('MUCHO', 'porcentaje', 150)`), (r, e) => !!e);

const compraC = await id(`select id from crear_compra('${C}', '${cursoPago}', 'PRUEBA10')`);
await espera('crear_compra: pendiente con precio, descuento y cupón', () => db.query(`select * from compras where id = '${compraC}'`), (r) => {
  const c = r.rows[0];
  return c.estado === 'pendiente' && Number(c.precio_lista) === 1 && Number(c.descuento) === 0.1 && Number(c.monto) === 0.9 && c.cupon_id && c.proveedor === 'mercadopago';
});
await db.query(`update compras set estado = 'aprobada', pago_id = 'pago-c' where id = '${compraC}'`);
await espera('aprobada: C tiene acceso', () => como('authenticated', C, `select tiene_acceso('${cursoPago}') as v`), (r) => r?.rows[0].v === true);
await espera('comprar de nuevo: "Ya tenés este curso"', () => db.query(`select crear_compra('${C}', '${cursoPago}')`), tiraError('Ya tenés'));
await espera('mismo cupón dos veces: "Ya usaste"', () => db.query(`select crear_compra('${C}', '${meses}', 'PRUEBA10')`), tiraError('Ya usaste'));
await espera('curso gratis: no se compra', () => db.query(`select crear_compra('${C}', '${fiebre}')`), tiraError('gratis'));
await espera('100 % off: aprobada sin cargo', () => db.query(`select * from crear_compra('${C}', '${alim}', 'PRUEBA100')`), (r) => r.rows[0].estado === 'aprobada' && r.rows[0].proveedor === 'sin_cargo' && Number(r.rows[0].monto) === 0);
await espera('100 % off: C tiene acceso', () => como('authenticated', C, `select tiene_acceso('${alim}') as v`), (r) => r?.rows[0].v === true);
await db.query(`update cupones set usos_maximos = 1 where codigo = 'PRUEBA100'`);
await espera('usos máximos agotados', () => db.query(`select crear_compra('${D}', '${meses}', 'PRUEBA100')`), tiraError('no tiene usos'));
await espera('monto que no cuadra: rechazado', () => db.query(`insert into compras (usuario_id, curso_id, precio_lista, descuento, monto) values ('${D}', '${meses}', 10, 2, 9)`), (r, e) => !!e);

await espera('certificado sin terminar: "Te faltan 3 clases"', () => como('authenticated', C, `select emitir_certificado('${alim}')`), tiraError('Te faltan 3 clases'));
await como('authenticated', C, `insert into progreso (usuario_id, clase_id, completada_at) select '${C}', id, now() from clases where curso_id = '${alim}'`);
await espera('certificado sin nombre en el perfil', () => como('authenticated', C, `select emitir_certificado('${alim}')`), tiraError('Completá tu nombre'));
await como('authenticated', C, `update perfiles set nombre = 'Carla Gómez' where id = '${C}'`);
const cert = await como('authenticated', C, `select * from emitir_certificado('${alim}')`);
await espera('certificado emitido con nombre y código de 10', async () => cert, (r) => r.rows[0].nombre_alumno === 'Carla Gómez' && r.rows[0].codigo.length === 10);
await espera('pedirlo de nuevo devuelve el mismo', () => como('authenticated', C, `select (emitir_certificado('${alim}')).id`), (r) => r?.rows[0].id === cert.rows[0].id);
await espera('anon verifica el código (en minúsculas)', () => como('anon', null, `select * from verificar_certificado('${cert.rows[0].codigo.toLowerCase()}')`), (r) => r?.rows[0]?.nombre_alumno === 'Carla Gómez' && r.rows[0].curso_titulo === 'Alimentación complementaria');
await espera('código falso: sin resultados', () => como('anon', null, `select * from verificar_certificado('XXXXXXXXXX')`), (r) => r?.rows.length === 0);
await espera('anon no lista certificados', () => como('anon', null, 'select * from certificados'), (r, e) => !!e || r.rows.length === 0);
await espera('C ve su certificado', () => como('authenticated', C, 'select * from certificados'), (r) => r?.rows.length === 1);
await espera('D no ve el certificado de C', () => como('authenticated', D, 'select * from certificados'), (r) => r?.rows.length === 0);
await espera('usuario NO inserta certificados', () => como('authenticated', D, `insert into certificados (usuario_id, curso_id, nombre_alumno, curso_titulo) values ('${D}', '${alim}', 'x', 'x')`), (r, e) => !!e);
await espera('anon NO emite certificados', () => como('anon', null, `select emitir_certificado('${alim}')`), (r, e) => !!e);
await espera('D sin acceso: no emite', () => como('authenticated', D, `select emitir_certificado('${alim}')`), tiraError('No tenés acceso'));
await espera('curso sin certificado', () => como('authenticated', C, `select emitir_certificado('${fiebre}')`), tiraError('no otorga certificado'));
await espera('cambiar el nombre no altera el certificado', async () => {
  await como('authenticated', C, `update perfiles set nombre = 'Otro' where id = '${C}'`);
  return db.query(`select nombre_alumno from certificados where id = '${cert.rows[0].id}'`);
}, (r) => r.rows[0].nombre_alumno === 'Carla Gómez');

// ---------------- Migración 3: arrepentimiento y términos ----------------
console.log('\n--- arrepentimiento y términos ---');
const E = '55555555-5555-5555-5555-555555555555';
await db.exec(`insert into auth.users values ('${E}', '{"nombre":"  Eva  ","acepto_terminos_version":"2026-10"}')`);
await espera('registro: copia versión de términos y fecha', () => db.query(`select * from perfiles where id = '${E}'`), (r) => {
  const p = r.rows[0];
  return p.nombre === 'Eva' && p.acepto_terminos_version === '2026-10' && p.acepto_terminos_at !== null;
});
await espera('registro sin términos: quedan vacíos', () => db.query(`select * from perfiles where id = '${D}'`), (r) => r.rows[0].acepto_terminos_version === null && r.rows[0].acepto_terminos_at === null);
await espera('backend registra un arrepentimiento', () => db.query(`insert into arrepentimientos (codigo, nombre, email) values ('ARR-1', 'Eva', 'e@x.com')`), (r, e) => !e);
await espera('anon NO crea arrepentimientos', () => como('anon', null, `insert into arrepentimientos (codigo, nombre, email) values ('ARR-2', 'x', 'x@x.com')`), (r, e) => !!e);
await espera('usuario NO lee arrepentimientos', () => como('authenticated', E, 'select * from arrepentimientos'), (r, e) => !!e || r.rows.length === 0);
await espera('código de arrepentimiento único', () => db.query(`insert into arrepentimientos (codigo, nombre, email) values ('ARR-1', 'x', 'x@x.com')`), (r, e) => !!e);

// ---------------- Migración 4: panel de administración ----------------
console.log('\n--- panel de administración ---');
const ADM = '66666666-6666-6666-6666-666666666666';
await db.exec(`insert into auth.users (id, raw_user_meta_data, email) values ('${ADM}', '{"nombre":"Admin"}', 'admin@x.com')`);
await db.exec(`update perfiles set rol = 'admin' where id = '${ADM}'`);
const nuevoCurso = `insert into cursos (slug, titulo, resumen, formato) values ('nuevo-${Math.random().toString(36).slice(2, 7)}', 'Nuevo', 'r', 'PDF') returning id`;

await espera('admin crea un curso', () => como('authenticated', ADM, nuevoCurso), (r, e) => !e && r.rows.length === 1);
await espera('alumno NO crea cursos', () => como('authenticated', E, nuevoCurso), (r, e) => !!e);
await espera('anon NO crea cursos', () => como('anon', null, nuevoCurso), (r, e) => !!e);
const cursoAdm = (await db.query(`select id from cursos where titulo = 'Nuevo' limit 1`)).rows[0].id;
await espera('admin edita precio', () => como('authenticated', ADM, `update cursos set precio = 5000 where id = '${cursoAdm}' returning precio`), (r) => Number(r?.rows[0]?.precio) === 5000);
await espera('alumno NO edita precio', () => como('authenticated', E, `update cursos set precio = 1 where id = '${cursoAdm}' returning id`), (r, e) => !!e || r.rows.length === 0);
await espera('admin crea una clase', () => como('authenticated', ADM, `insert into clases (curso_id, slug, titulo, tipo, orden) values ('${cursoAdm}', 'c1', 'Clase', 'pdf', 1) returning id`), (r, e) => !e);
const claseAdm = (await db.query(`select id from clases where curso_id = '${cursoAdm}'`)).rows[0].id;
await espera('admin carga el medio de la clase', () => como('authenticated', ADM, `insert into clases_medios (clase_id, pdf_ruta) values ('${claseAdm}', 'cursos/x/a.pdf')`), (r, e) => !e);
await espera('admin ve los medios', () => como('authenticated', ADM, `select * from clases_medios where clase_id = '${claseAdm}'`), (r) => r?.rows.length === 1);
await espera('alumno sigue sin ver medios', () => como('authenticated', E, 'select * from clases_medios'), (r, e) => !!e || r.rows.length === 0);
await espera('admin ve todas las compras', () => como('authenticated', ADM, 'select * from compras'), (r) => r?.rows.length >= 2);
await espera('alumno sigue viendo solo las suyas', () => como('authenticated', E, 'select * from compras'), (r) => r?.rows.length === 0);
await espera('admin ve todos los turnos', () => como('authenticated', ADM, 'select * from turnos'), (r) => r?.rows.length >= 1);
await espera('admin ve arrepentimientos', () => como('authenticated', ADM, 'select * from arrepentimientos'), (r) => r?.rows.length === 1);
await espera('admin marca arrepentimiento atendido', () => como('authenticated', ADM, `update arrepentimientos set atendido_at = now(), respuesta = 'ok' returning id`), (r) => r?.rows.length === 1);
await espera('alumno NO ve arrepentimientos', () => como('authenticated', E, 'select * from arrepentimientos'), (r, e) => !!e || r.rows.length === 0);
await espera('admin crea cupón', () => como('authenticated', ADM, `insert into cupones (codigo, tipo, valor) values ('ADMIN20', 'porcentaje', 20)`), (r, e) => !e);
await espera('alumno sigue sin ver cupones', () => como('authenticated', E, 'select * from cupones'), (r, e) => !!e || r.rows.length === 0);
await espera('admin da acceso manual', () => como('authenticated', ADM, `insert into accesos (usuario_id, curso_id, origen) values ('${E}', '${cursoAdm}', 'manual')`), (r, e) => !e);
await espera('admin NO puede inventar un acceso "compra"', () => como('authenticated', ADM, `insert into accesos (usuario_id, curso_id, origen) values ('${D}', '${cursoAdm}', 'compra')`), (r, e) => !!e);
await espera('admin quita el acceso', () => como('authenticated', ADM, `update accesos set revocado_at = now() where usuario_id = '${E}' and curso_id = '${cursoAdm}' returning 1`), (r) => r?.rows.length === 1);
await espera('admin edita testimonios y obras sociales', async () => {
  await como('authenticated', ADM, `insert into testimonios (texto, autor, permiso_at) values ('t', 'a', current_date)`);
  return como('authenticated', ADM, `insert into obras_sociales (nombre) values ('OSDE prueba') returning id`);
}, (r, e) => !e);
await espera('alumno NO edita obras sociales', () => como('authenticated', E, `insert into obras_sociales (nombre) values ('x')`), (r, e) => !!e);
await espera('admin_usuarios: lista con email', () => como('authenticated', ADM, 'select * from admin_usuarios()'), (r) => r?.rows.some((u) => u.email === 'admin@x.com'));
await espera('admin_usuarios: alumno rechazado', () => como('authenticated', E, 'select * from admin_usuarios()'), tiraError('Solo para administradores'));
await espera('admin_usuarios: anon sin permiso', () => como('anon', null, 'select * from admin_usuarios()'), (r, e) => !!e);
await espera('admin_resumen_ventas', () => como('authenticated', ADM, 'select * from admin_resumen_ventas()'), (r, e) => !e && r.rows.length >= 1);
await espera('bucket materiales privado y solo PDF', () => db.query(`select * from storage.buckets where id = 'materiales'`), (r) => r.rows[0]?.public === false && r.rows[0].allowed_mime_types[0] === 'application/pdf');
await espera('admin sube a materiales', () => como('authenticated', ADM, `insert into storage.objects (bucket_id, name) values ('materiales', 'cursos/x/a.pdf')`), (r, e) => !e);
await espera('alumno NO sube a materiales', () => como('authenticated', E, `insert into storage.objects (bucket_id, name) values ('materiales', 'cursos/x/b.pdf')`), (r, e) => !!e);
await espera('alumno NO ve archivos de materiales', () => como('authenticated', E, `select * from storage.objects where bucket_id = 'materiales'`), (r) => r?.rows.length === 0);
const ordenes = async () => (await db.query(`select cl.slug from clases cl join cursos c on c.id = cl.curso_id where c.slug = 'primeros-meses' order by cl.orden`)).rows.map((r) => r.slug).join(',');
const llanto = await id(`select cl.id from clases cl join cursos c on c.id = cl.curso_id where c.slug = 'primeros-meses' and cl.slug = 'llanto'`);
await espera('admin sube una clase de lugar', async () => {
  await como('authenticated', ADM, `select admin_mover_clase('${llanto}', -1)`);
  return ordenes();
}, (r) => r === 'bienvenida,llanto,sueno,material');
await espera('mover la primera hacia arriba no hace nada', async () => {
  const primera = await id(`select cl.id from clases cl join cursos c on c.id = cl.curso_id where c.slug = 'primeros-meses' and cl.slug = 'bienvenida'`);
  await como('authenticated', ADM, `select admin_mover_clase('${primera}', -1)`);
  return ordenes();
}, (r) => r === 'bienvenida,llanto,sueno,material');
await espera('alumno NO reordena clases', () => como('authenticated', E, `select admin_mover_clase('${llanto}', 1)`), tiraError('Solo para administradores'));
await espera('curso con ventas no se borra', () => como('authenticated', ADM, `delete from cursos where slug = 'adolescencia-estar-cerca'`), (r, e) => !!e);
await espera('admin borra curso sin ventas', () => como('authenticated', ADM, `delete from cursos where id = '${cursoAdm}' returning id`), (r) => r?.rows.length === 1);

console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
