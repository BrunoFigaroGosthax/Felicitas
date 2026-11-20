-- Felicitas · textos del sitio que la administradora cambia desde el panel (Panel → Textos).
-- Solo guarda lo que se cambió: { inicio: {...}, contacto: {...}, sedes: { ciev: {...}, ospepri: {...} } }.
-- Lo que falta se toma de los textos originales del código (src/data/contenido.js).
alter table public.ajustes
  add column textos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(textos) = 'object');
