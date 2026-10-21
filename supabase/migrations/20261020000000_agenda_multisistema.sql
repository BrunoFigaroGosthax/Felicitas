-- =====================================================================
-- Felicitas · agenda con varios sistemas de turnos, y portadas de cursos
--
-- Reglas:
--   A. Cada turno vive en UN solo sistema (donde se reservó), con sus datos.
--   B. A los demás sistemas solo se les manda un "ocupado" (fecha, hora,
--      duración), sin datos del paciente.
--   C. La web no tiene agenda propia: ofrece lo libre en todos y reserva en uno.
-- agenda_bloqueos registra qué "ocupado" se creó en qué sistema por cada turno,
-- para no duplicarlos ni dejarlos huérfanos. Solo la usa el backend.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Turnos: en qué sistema quedó cada uno
-- ---------------------------------------------------------------------
alter table public.turnos rename column drapp_id to externo_id;
alter table public.turnos drop constraint turnos_drapp_id_key;
alter table public.turnos
  add column sistema text not null default 'drapp',
  add column cancelado_at timestamptz,
  add column recordatorio_enviado_at timestamptz,
  add constraint turnos_externo_unico unique (sistema, externo_id);

create index turnos_recordatorio_idx on public.turnos (fecha) where estado = 'reservado' and recordatorio_enviado_at is null;


-- ---------------------------------------------------------------------
-- Bloqueos "ocupado" creados en los otros sistemas
-- ---------------------------------------------------------------------
create table public.agenda_bloqueos (
  id uuid primary key default gen_random_uuid(),
  origen_sistema text not null,          -- sistema donde vive el turno
  origen_id text not null,               -- id del turno en ese sistema
  destino_sistema text not null,         -- sistema donde se puso el "ocupado"
  bloqueo_id text,                       -- id del "ocupado" en el destino; null = falta crearlo
  fecha date not null,
  hora time not null,
  duracion_min int not null default 30 check (duracion_min > 0),
  intentos int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (origen_sistema, origen_id, destino_sistema),
  check (origen_sistema <> destino_sistema)
);

create index agenda_bloqueos_pendientes_idx on public.agenda_bloqueos (destino_sistema) where bloqueo_id is null;
create index agenda_bloqueos_fecha_idx on public.agenda_bloqueos (fecha);

create trigger agenda_bloqueos_updated_at before update on public.agenda_bloqueos
  for each row execute function public.set_updated_at();

alter table public.agenda_bloqueos enable row level security;
revoke all on public.agenda_bloqueos from anon, authenticated;
grant select on public.agenda_bloqueos to authenticated;
create policy "bloqueos: admin ve" on public.agenda_bloqueos
  for select to authenticated using ((select public.es_admin()));


-- ---------------------------------------------------------------------
-- Portadas de los cursos: bucket público de imágenes (hasta 2 MB).
-- Las sube el admin; cualquiera las ve (son la tapa del curso).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portadas', 'portadas', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "portadas: admin ve" on storage.objects
  for select to authenticated using (bucket_id = 'portadas' and (select public.es_admin()));
create policy "portadas: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'portadas' and (select public.es_admin()));
create policy "portadas: admin reemplaza" on storage.objects
  for update to authenticated using (bucket_id = 'portadas' and (select public.es_admin()));
create policy "portadas: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'portadas' and (select public.es_admin()));
