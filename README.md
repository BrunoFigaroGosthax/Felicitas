# Felicitas · web

Sitio de Felicitas, pediatría con propósito: presentación, turnos online y cursos para familias.

## Empezar

Requisitos: Node 20.6 o superior.

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

Con `VITE_USE_MOCKS=true` el sitio funciona solo, con datos de ejemplo y una cuenta de prueba (cualquier email y contraseña). Para probar contra el backend:

```bash
cp server/.env.example server/.env
# en .env: VITE_USE_MOCKS=false (y las variables de Supabase)
npm run dev:server     # en otra terminal, http://localhost:3001
```

Antes de subir cambios: `npm run check` (lint, pruebas, pruebas de la base y build).

## Subir a GitHub

```bash
git init
git add .
git commit -m "Proyecto base"
git branch -M main
git remote add origin https://github.com/<usuario>/felicitas-web.git
git push -u origin main
```

## Deploy (Vercel)

Importar el repo en Vercel: detecta Vite (build `npm run build`, salida `dist`) y publica `api/` como función. Cargar las variables de `.env.example` y `server/.env.example` en Settings → Environment Variables.

Base de datos: aplicar `supabase/migrations/` en orden (SQL Editor o `supabase db push`).

Detalles del proyecto, reglas de diseño y pendientes: ver `CLAUDE.md`.
