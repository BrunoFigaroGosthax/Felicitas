-- Felicitas · ajustes generales del sitio. Por ahora: modo mantenimiento.
-- Una sola fila. Para poner el sitio en mantenimiento (Table Editor → ajustes, o SQL Editor):
--   update public.ajustes set mantenimiento = true;   -- y false para volver a abrirlo
-- `mensaje` (opcional) reemplaza el texto del aviso.
create table public.ajustes (
  id boolean primary key default true check (id),  -- garantiza una sola fila
  mantenimiento boolean not null default false,
  mensaje text,
  actualizado_at timestamptz not null default now()
);

insert into public.ajustes default values;

alter table public.ajustes enable row level security;

-- Todos pueden leerla: el sitio decide qué mostrar antes de saber quién entra.
create policy "ajustes: lectura pública" on public.ajustes
  for select using (true);

-- Para el futuro interruptor del panel.
create policy "ajustes: admin edita" on public.ajustes
  for update using (public.es_admin()) with check (public.es_admin());

create function public.ajustes_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_at := now();
  return new;
end;
$$;

create trigger ajustes_actualizado before update on public.ajustes
  for each row execute function public.ajustes_actualizado();
