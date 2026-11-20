-- Felicitas · imágenes del sitio que la administradora cambia desde el panel (Panel → Imágenes).
-- La web las convierte a WebP antes de subirlas. Columna vacía = se usa la imagen original de /img.
alter table public.ajustes
  add column imagen_retrato text,      -- URL pública: foto de la portada de inicio
  add column imagen_consultorio text;  -- URL pública: foto de "Sobre mí"

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sitio', 'sitio', true, 3145728, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "sitio: admin ve" on storage.objects
  for select to authenticated using (bucket_id = 'sitio' and (select public.es_admin()));
create policy "sitio: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'sitio' and (select public.es_admin()));
create policy "sitio: admin reemplaza" on storage.objects
  for update to authenticated using (bucket_id = 'sitio' and (select public.es_admin()));
create policy "sitio: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'sitio' and (select public.es_admin()));
