-- =====================================================================
-- Felicitas · botón de arrepentimiento y aceptación de términos al registrarse
-- =====================================================================


-- ---------------------------------------------------------------------
-- Solicitudes del botón de arrepentimiento (Res. 424/2020 de Defensa del Consumidor).
-- Las crea el backend; se atienden desde el panel de Supabase. PRIVADA.
-- ---------------------------------------------------------------------
create table public.arrepentimientos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,            -- código de seguimiento que recibe la persona
  nombre text not null,
  email text not null,
  telefono text,
  compra_referencia text,                 -- lo que la persona indique: curso, fecha, n.º de operación
  detalle text,
  compra_id uuid references public.compras (id) on delete set null,  -- se completa al atenderla
  atendido_at timestamptz,
  respuesta text,
  created_at timestamptz not null default now()
);

create index arrepentimientos_pendientes_idx on public.arrepentimientos (created_at) where atendido_at is null;

alter table public.arrepentimientos enable row level security;
revoke all on public.arrepentimientos from anon, authenticated;


-- ---------------------------------------------------------------------
-- Al registrarse, el frontend manda en options.data: { nombre, acepto_terminos_version }.
-- Se copia al perfil con la fecha, como constancia de aceptación.
-- ---------------------------------------------------------------------
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text := nullif(btrim(new.raw_user_meta_data ->> 'acepto_terminos_version'), '');
begin
  insert into public.perfiles (id, nombre, acepto_terminos_version, acepto_terminos_at)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''),
    v_version,
    case when v_version is not null then now() end
  );
  return new;
end;
$$;
