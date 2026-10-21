# Felicitas · web

Sitio de la Dra. Felicitas Pino, pediatra ("Felicitas, pediatría con propósito"). Tres partes:
1. **Landing** de presentación (`/`).
2. **Turnos** online (`/turnos`), conectado a **DrApp** a través del backend.
3. **Cursos** (`/cursos`, `/cursos/:slug`): PDF y videos, gratuitos y pagos, con cuenta, progreso, cupones y certificados.

Criterio de infraestructura: arrancar con lo más económico y escalar cuando haya más alumnos.

## Stack

- Frontend: React 18 + Vite 6 + Tailwind CSS v4 (`@tailwindcss/vite`) + React Router 6. JavaScript (JSX).
- Backend: Express en `server/`, corre como **función serverless de Vercel** (`api/index.js`). Mismo dominio que el frontend.
- Servicios: Supabase (base de datos, cuentas y PDF), Bunny Stream (videos), Mercado Pago (pagos), Resend (emails), DrApp (agenda).
- Un solo `package.json` en la raíz (Vercel instala desde ahí).

## Comandos

```bash
npm install
npm run dev          # frontend en http://localhost:5173 (proxy /api → :3001)
npm run dev:server   # backend en http://localhost:3001 (lee server/.env)
npm run lint         # ESLint
npm test             # pruebas del backend (node:test)
npm run test:db      # pruebas del esquema de Supabase en Postgres en memoria (PGlite)
npm run build        # vite build + scripts/prerender.mjs
npm run check        # todo lo anterior; lo mismo corre en CI (.github/workflows/ci.yml)
```

## Modo demo e integraciones

- `VITE_USE_MOCKS=true` (por defecto): la web funciona sola. Sesión de prueba (cualquier email y contraseña), compras, progreso y certificados en localStorage. Cupones de prueba: `PRUEBA10`, `PRUEBA100`.
- Con `VITE_USE_MOCKS=false` y las variables de Supabase, todo pasa a la base real (`src/lib/supabase.js`).
- Backend: cada integración se activa sola cuando están sus variables (`server/lib/config.js`, ver `server/.env.example`). Sin ellas responde **503** con mensaje claro (Supabase, Mercado Pago, Bunny) o simula (DrApp, emails en consola).

## Estructura

- `src/styles/index.css`: tokens del sistema de diseño en `@theme`. **Única fuente de verdad de estilos.** También estilos `.legal` y de impresión (`.no-imprimir`).
- `src/components/ui/`: Button, Badge, Field, Casilla (checkbox), Aviso (mensajes), PanelFormulario, OpcionChip, GrupoOpciones (radiogroup con flechas; envolver siempre los OpcionChip con este), Ondas, Icono, Encabezado.
- `src/components/layout/`: Header, Footer (legales + botón de arrepentimiento), Layout, RequiereSesion (+ `destinoSeguro` para `?volver=`), PaginaLegal.
- `src/pages/`: Inicio, Turnos, Cursos, Curso, Acceso (ingresar / crear cuenta), Recuperar, NuevaClave, MiCuenta, PagoResultado, Certificado, Privacidad, Terminos, Arrepentimiento, NoEncontrada.
- `src/services/`: `auth`, `cursos` (compras, certificados), `progreso`, `contenido` (testimonios, obras sociales, arrepentimiento), `turnos`, `formato`, `api`. Las páginas nunca llaman a `fetch` ni a Supabase directo: pasan por acá.
- `src/context/Sesion.jsx`: `useSesion()` → `{ usuario, cargando }`.
- `src/data/`: contenido fijo y datos del modo demo. `legal.js`: `TERMINOS_VERSION` (subirla al cambiar los textos legales) y datos del responsable.
- `src/hooks/`: `useProgreso(curso)` (cuenta si hay sesión, si no localStorage), `useTitulo` (llamarlo en cada página).
- `server/app.js` (rutas), `server/routes/`: `turnos`, `compras`, `clases` (URLs firmadas de Bunny), `webhooks` (Mercado Pago), `arrepentimiento`.
- `server/lib/`: `supabase`, `auth` (JWT de Supabase), `mercadopago`, `bunny`, `email` + `plantillas`, `drapp` (**pendiente**), `limite` (rate limit por IP), `validar`.
- `scripts/prerender.mjs`: HTML de las páginas públicas fijas con título y Open Graph, `app.html` (fallback de la SPA) y `robots.txt`. Necesita `SITE_URL` al hacer build. Las páginas de cada curso y el `sitemap.xml` se arman en el momento con la base (`server/routes/paginas.js`, reescritos en `vercel.json`): un curso cargado desde el panel no necesita volver a publicar. Meta compartida en `server/lib/meta.js`. Imagen para compartir: `public/img/og.png`.
- Video: el reproductor de Bunny se controla con Player.js (`src/lib/reproductor.js`): guarda el minuto (`progreso.posicion_segundos`), retoma y marca la clase como vista al terminar. Probado con un reproductor simulado; verificar con Bunny real.
- `supabase/templates/`: emails de Supabase Auth en español (pegarlos en Authentication → Emails).
- `vercel.json`: rewrites (`/api` → función; resto → `app.html`), `cleanUrls`, CSP y encabezados de seguridad. Si se agrega un dominio externo (analítica, etc.), sumarlo a la CSP.

## Agenda con varios sistemas de turnos (`server/lib/agenda/`)

La doctora toma turnos en DrApp y en otro sistema (pendiente: saber cuál). Reglas, sin excepciones:
- **A.** Cada turno vive en UN solo sistema, con los datos del paciente.
- **B.** A los demás solo se les manda un "ocupado" (fecha, hora, duración), nunca datos del paciente.
- **C.** La web no tiene agenda propia: ofrece lo libre en TODOS los sistemas y reserva en el principal (DrApp). Justo antes de reservar vuelve a chequear (409 si se ocupó). Si un sistema no responde, no se ofrecen horarios.
- `nucleo.js`: lógica (disponibilidad, reservar, cancelar, avisos, reconciliar) con adaptadores; probada con sistemas simulados en `nucleo.test.js`. Una vez reservado, nada posterior puede hacer fallar la respuesta (evita turnos dobles).
- Adaptadores: `drapp.js` (principal; datos de ejemplo hasta tener la API) y `otro.js` (plantilla). Contrato documentado arriba de `nucleo.js`.
- `agenda_bloqueos` registra cada "ocupado" puesto; los avisos sobre nuestros propios bloqueos se ignoran (sin bucles).
- Webhooks: `POST /api/agenda/avisos/:sistema`. Revisión periódica: `GET /api/agenda/reconciliar` (cron diario de Vercel + workflow `.github/workflows/agenda.yml` cada 15 min, inactivo hasta configurar `SITE_URL` y `CRON_SECRET` en GitHub) y botón "Sincronizar ahora" en el panel.
- Recordatorios por email el día anterior (`/api/agenda/recordatorios`, cron diario). Cancelación por el paciente con link firmado (`/turnos/cancelar?t=…`, `server/lib/tokens.js`).
- No se le manda a la doctora un email por cada turno: sería un sistema más recibiendo datos de pacientes (los sistemas de turnos ya le avisan).

## Panel de administración (`/admin`)

- Acceso: `perfiles.rol = 'admin'`, asignado a mano en Supabase (`update public.perfiles set rol = 'admin' where id in (select id from auth.users where email = '...')`). El encabezado muestra "Panel" a los admin (`useSesion().esAdmin`: true / false / null mientras carga).
- Secciones en `src/pages/admin/` (cargadas con `lazy`): cursos y clases (con subida de video y PDF), ventas, alumnos (dar/quitar acceso), cupones, turnos, arrepentimientos, contenido (testimonios y obras sociales). Piezas comunes en `src/components/admin/ui.jsx`.
- `src/services/admin.js` habla directo con Supabase con la sesión del admin (políticas `es_admin()`, migración `20261018000000_panel_admin.sql`). Solo los videos pasan por el backend (`server/routes/admin.js`), que tiene la API key de Bunny.
- **PDF**: Supabase Storage, bucket privado `materiales` (solo PDF, 50 MB). El alumno recibe un link firmado del backend (`/api/clases/:id/medio`).
- **Videos**: Bunny Stream. El navegador sube directo a Bunny por TUS con una firma del backend (`tus-js-client`), sin pasar por Vercel. El estado y la duración se consultan a Bunny.
- Un curso con ventas no se borra (FK): se despublica. Borrar un curso o clase borra también sus PDF y videos.

## Base de datos (Supabase)

- Migraciones en `supabase/migrations/` (en orden), `supabase/seed.sql` (solo desarrollo), pruebas en `supabase/tests/`.
- Tablas: `perfiles` (se crea sola al registrarse, copia nombre y versión de términos aceptada), `cursos`, `clases`, `clases_medios` (IDs de Bunny, **privada**), `compras`, `accesos`, `progreso`, `eventos_pago` (**privada**), `turnos` (registro mínimo; los datos del paciente van solo a DrApp), `cupones` (**privada**), `certificados`, `testimonios`, `obras_sociales`, `arrepentimientos` (**privada**). Vista `progreso_por_curso`.
- Funciones: `tiene_acceso`, `puede_ver_clase`, `es_admin` (usan `auth.uid()`: el backend las llama con el JWT del usuario); `crear_compra` y `calcular_precio` (solo service role; el monto lo calcula la base, nunca el frontend); `emitir_certificado` (usuario) y `verificar_certificado` (público).
- Compra `aprobada` → crea el acceso (trigger). `reembolsada` → lo revoca. El webhook solo cambia el estado.
- Llamar a las funciones que devuelven filas con `select * from f(...)`, nunca `select (f(...)).*` (Postgres las ejecutaría una vez por columna).
- El frontend (clave anon) lee el catálogo, testimonios y obras sociales, y escribe solo su perfil y su progreso. Todo lo demás, el backend. Cambios de esquema: migración nueva, nunca editar una ya aplicada; correr `npm run test:db`.

## Reglas de diseño (no romper)

- Usar siempre los tokens: `bg-lavanda`, `bg-menta`, `bg-amarillo`, `text-ink`, `text-ink-muted`, `text-menta-deep`, `border-borde`, `rounded-card`, `shadow-soft`, `font-display`, `font-body`, `font-accent`. Nada de hex sueltos en componentes.
- Texto sobre lavanda, menta o amarillo: siempre `text-on-brand` / `text-ink`. **Nunca** texto amarillo sobre lavanda o menta, ni texto menta sobre blanco (no tiene contraste). Para texto de acento sobre claro: `text-menta-deep`.
- Botones y chips en pill (`rounded-full`), cards en `rounded-card` (28px), campos en `rounded-campo` (8px).
- Áreas táctiles de 44px como mínimo. Foco visible (`:focus-visible` global).
- Mobile first: layouts con `flex-wrap` / `grid auto-fit`, títulos con `clamp()`. Probar siempre a 390px. El menú completo del encabezado aparece desde `lg`.
- Las ondas (`<Ondas>`) son decoración: nunca detrás de texto corrido.
- Voz: cálida, clara, trato con "te"/voseo rioplatense ("pedí", "elegí"). Sin emojis en la web. Sin tecnicismos.
- No inventar datos de la doctora ni datos legales: lo que falta va entre corchetes `[ASÍ]` hasta tener el dato real.

## Pendientes

1. **Conectar servicios**: Supabase ya conectado (proyecto `bvexuvbchnvbsiuydgtm`, migraciones aplicadas); falta en Auth: Site URL y Redirect URLs, plantillas de email en español, SMTP propio con Resend. Bunny Stream (biblioteca con token authentication y API key), Mercado Pago (credenciales y webhook a `/api/webhooks/mercadopago` con su secreto), Vercel (variables de `.env.example` y `server/.env.example`).
2. **DrApp**: conseguir documentación y credenciales; implementar `server/lib/drapp.js` (disponibilidad y reserva, horario ya ocupado → 409). Definir si la confirmación por WhatsApp la manda DrApp.
3. **Legal**: revisar con abogado privacidad, términos y arrepentimiento (`[corchetes]` en `src/pages/Privacidad.jsx`, `Terminos.jsx`, `src/data/legal.js`); registrar la base en la AAIP; facturación en ARCA con el contador.
4. **Contenido real**: fotos, bio, matrícula, dirección, obras sociales, precios, testimonios (con permiso), descripciones de clases, imagen para compartir `public/img/og.png` (1200×630).
5. **Logos y fuentes**: pedir SVG/AI original; archivos de Nekta, Talina y Pogonia y activarlas en `index.css`.
6. Dominio `.com.ar`, analítica (Plausible no requiere banner de cookies), Sentry, monitoreo de caída, backups de Supabase (plan Pro o backup programado).
7. Marcar las cuentas admin (Bruno y la doctora) cuando se registren. Cargar las claves de Bunny Stream para habilitar la subida de videos.

## Referencias de diseño

- Sistema de diseño (claude.ai): https://claude.ai/code/artifact/a6e38ca6-1544-42f7-ae6e-ae9af315ddca
- Pantallas de referencia (claude.ai): https://claude.ai/artifact/1UaoCwYAtgjpYRBaxHwt7q
