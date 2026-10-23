# Lista de chequeo para el lanzamiento

Hoy el sitio funciona como **demo**. Antes de abrirlo al público, todo esto tiene que estar resuelto.
Marcar cada punto al hacerlo.

## 1. Seguridad: apagar lo que es solo de demostración

- [ ] **Borrar los cupones de prueba** (`PRUEBA100` regala cualquier curso a quien conozca el código). En el SQL Editor de Supabase:
      `delete from public.cupones where codigo in ('PRUEBA10', 'PRUEBA100');`
      (si ya se usaron, no se pueden borrar: pausarlos desde Panel → Cupones).
- [ ] **Sacar `PAGOS_DEMO`** de las variables de Vercel y hacer Redeploy.
- [ ] **Borrar las compras de demostración** y los accesos que dieron:
      `delete from public.accesos where compra_id in (select id from public.compras where proveedor = 'demo');`
      `delete from public.compras where proveedor = 'demo';`
- [ ] **Volver a activar "Confirm email"** en Supabase → Authentication → Providers → Email.
- [ ] Revisar quiénes tienen rol admin (Panel → Alumnos, columna Rol): solo las personas que corresponde.

## 2. Servicios conectados y probados en real

- [ ] **Dominio propio** apuntando a Vercel; actualizar `SITE_URL` en Vercel y la Site URL / Redirect URLs en Supabase.
- [ ] **Resend**: dominio verificado, SMTP cargado en Supabase, plantillas de `supabase/templates/` pegadas, `RESEND_API_KEY` y `EMAIL_FROM` en Vercel. Probar: crear cuenta, recuperar contraseña, turno, compra.
- [ ] **Mercado Pago**: `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`, webhook apuntando a `https://<dominio>/api/webhooks/mercadopago`. Hacer una compra real chica y un reembolso.
- [ ] **Bunny Stream**: las tres claves; subir un video desde el panel, verlo como alumno y comprobar que retoma donde quedó.
- [ ] **DrApp** (y el otro sistema de turnos, si aplica): adaptadores completos en `server/lib/agenda/`; reservar, cancelar y verificar que el "ocupado" aparece en el otro sistema.
- [ ] Workflow de GitHub "Agenda" (sincronización cada 15 min): variable `SITE_URL` y secreto `CRON_SECRET` en GitHub.

## 3. Contenido real

- [ ] Datos de la doctora en `src/data/contenido.js`: matrícula, dirección, horarios, WhatsApp, email, Instagram (confirmar el usuario correcto).
- [ ] Presentación real en "Sobre mí" (`src/pages/Inicio.jsx`) y foto real del consultorio (`public/img/consultorio.jpg`).
- [ ] Obras sociales reales y testimonios con permiso (Panel → Contenido). Borrar los de ejemplo entre corchetes.
- [ ] Cursos: precios reales, descripciones revisadas, videos y PDF cargados. Borrar o despublicar los cursos de ejemplo que no se usen.
- [ ] Fuentes de marca (Nekta, Talina, Pogonia) en `public/fonts` y activadas en `src/styles/index.css`; logos en SVG.

## 4. Legal y administrativo

- [ ] Términos y política de privacidad revisados por un abogado; completar los datos entre corchetes (`src/data/legal.js`, `src/pages/Terminos.jsx`, `src/pages/Privacidad.jsx`) y subir `TERMINOS_VERSION`.
- [ ] Registro de la base de datos en la AAIP (Ley 25.326).
- [ ] Facturación de las ventas en ARCA (definir con el contador).

## 5. Operación

- [ ] Backups de la base (plan Pro de Supabase o backup programado).
- [ ] Monitoreo de errores (por ejemplo Sentry) y aviso si el sitio se cae.
- [ ] Analítica (Plausible no necesita banner de cookies).
- [ ] Probar en celulares reales, en especial iPhone con Safari.
- [ ] Correr todas las pruebas contra el sitio publicado:
      `E2E_URL=https://<dominio> npm run test:e2e` (requiere `server/.env` con las claves de Supabase).
