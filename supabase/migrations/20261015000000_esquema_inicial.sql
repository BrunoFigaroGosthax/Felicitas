-- =====================================================================
-- Felicitas · esquema inicial de la base de datos (Supabase / Postgres)
--
-- Usuarios (Supabase Auth), cursos, clases, compras, accesos, progreso,
-- eventos de pago y registro de turnos.
--
-- Videos y PDF viven en Bunny: acá solo se guardan sus identificadores, en
-- `clases_medios`, que el frontend no puede leer. El backend firma las URLs
-- de Bunny solo si `puede_ver_clase()` da verdadero para ese usuario.
--
-- Regla de seguridad: el frontend usa la clave pública (anon) y solo puede
-- hacer lo que permiten las políticas RLS. Todo lo que crea compras, accesos
-- o turnos lo hace el backend con la service role key (que saltea RLS).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('alumno', 'admin');
create type public.tipo_clase as enum ('video', 'pdf');
create type public.estado_compra as enum ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'reembolsada');
create type public.origen_acceso as enum ('compra', 'manual');
create type public.estado_turno as enum ('reservado', 'cancelado');


-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- Perfiles: un registro por usuario de Supabase Auth (el email vive en auth.users)
-- ---------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  telefono text,
  rol public.rol_usuario not null default 'alumno',
  -- Aceptación de términos y política de privacidad (Ley 25.326).
  acepto_terminos_version text,
  acepto_terminos_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger perfiles_updated_at before update on public.perfiles
  for each row execute function public.set_updated_at();

-- Al registrarse, se crea el perfil. El nombre llega en options.data.nombre del signUp.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  );
$$;


-- ---------------------------------------------------------------------
-- Cursos
-- ---------------------------------------------------------------------
create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  resumen text not null,
  descripcion text,
  formato text not null,                          -- 'PDF', 'Video', 'Video + PDF'
  precio numeric(12, 2) not null default 0 check (precio >= 0),  -- 0 = gratis
  moneda char(3) not null default 'ARS',
  portada_fondo text not null default 'lavanda' check (portada_fondo in ('lavanda', 'menta', 'amarillo')),
  portada_ondas jsonb not null default '[]',      -- [{ "trazo": "a", "color": "menta" }], ver <Ondas>
  portada_imagen text,                            -- URL pública (CDN de Bunny); si está, reemplaza a las ondas
  destacado boolean not null default false,       -- aparece en la home
  publicado boolean not null default false,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cursos_updated_at before update on public.cursos
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Clases de cada curso (datos visibles: título, tipo, duración…)
-- ---------------------------------------------------------------------
create table public.clases (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete cascade,
  slug text not null,
  titulo text not null,
  descripcion text,
  tipo public.tipo_clase not null,
  orden int not null,
  duracion_segundos int check (duracion_segundos > 0),
  muestra boolean not null default false,         -- clase de muestra gratis dentro de un curso pago
  tiene_material boolean not null default false,  -- clase en video con PDF de apoyo (ruta en clases_medios)
  publicada boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curso_id, slug),
  unique (curso_id, orden) deferrable initially deferred  -- permite reordenar en una transacción
);

create trigger clases_updated_at before update on public.clases
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Medios de cada clase en Bunny. PRIVADO: sin políticas, solo el backend.
-- ---------------------------------------------------------------------
create table public.clases_medios (
  clase_id uuid primary key references public.clases (id) on delete cascade,
  bunny_video_id text,      -- GUID del video en Bunny Stream (clases tipo video)
  pdf_ruta text,            -- ruta en Bunny Storage (clases tipo pdf), ej.: cursos/fiebre/guia.pdf
  material_ruta text,       -- PDF de apoyo de una clase en video
  updated_at timestamptz not null default now()
);

create trigger clases_medios_updated_at before update on public.clases_medios
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Compras (Mercado Pago u otro). Las crea y actualiza el backend.
-- usuario_id queda en null si el usuario borra su cuenta: el registro de la venta se conserva.
-- ---------------------------------------------------------------------
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfiles (id) on delete set null,
  curso_id uuid not null references public.cursos (id) on delete restrict,
  estado public.estado_compra not null default 'pendiente',
  monto numeric(12, 2) not null check (monto >= 0),  -- precio al momento de la compra
  moneda char(3) not null default 'ARS',
  proveedor text not null default 'mercadopago',
  preferencia_id text,      -- checkout creado en el proveedor
  pago_id text,             -- pago confirmado (llega por webhook)
  aprobada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (proveedor, pago_id)
);

create index compras_usuario_idx on public.compras (usuario_id);
create index compras_curso_idx on public.compras (curso_id);

create trigger compras_updated_at before update on public.compras
  for each row execute function public.set_updated_at();

create function public.marcar_compra_aprobada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'aprobada' and new.aprobada_at is null then
    new.aprobada_at = now();
  end if;
  return new;
end;
$$;

create trigger compras_aprobada_at before insert or update of estado on public.compras
  for each row execute function public.marcar_compra_aprobada();


-- ---------------------------------------------------------------------
-- Accesos a cursos pagos. Los cursos gratis no necesitan registro acá.
-- ---------------------------------------------------------------------
create table public.accesos (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  curso_id uuid not null references public.cursos (id) on delete cascade,
  origen public.origen_acceso not null,           -- 'manual': regalo o cortesía dado desde el panel
  compra_id uuid references public.compras (id) on delete set null,
  otorgado_at timestamptz not null default now(),
  vence_at timestamptz,                           -- null = acceso de por vida
  revocado_at timestamptz,
  primary key (usuario_id, curso_id)
);

create index accesos_curso_idx on public.accesos (curso_id);
create index accesos_compra_idx on public.accesos (compra_id);

-- Compra aprobada → da acceso. Reembolso → lo revoca.
create function public.sincronizar_acceso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.usuario_id is null then
    return new;
  end if;

  if new.estado = 'aprobada' then
    if tg_op = 'INSERT' or old.estado <> 'aprobada' then
      insert into public.accesos (usuario_id, curso_id, origen, compra_id)
      values (new.usuario_id, new.curso_id, 'compra', new.id)
      on conflict (usuario_id, curso_id) do update
        set origen = 'compra', compra_id = excluded.compra_id, otorgado_at = now(), revocado_at = null;
    end if;
  elsif new.estado = 'reembolsada' and tg_op = 'UPDATE' then
    if old.estado = 'aprobada' then
      update public.accesos set revocado_at = now() where compra_id = new.id;
    end if;
  end if;

  return new;
end;
$$;

create trigger compras_sincronizar_acceso after insert or update of estado on public.compras
  for each row execute function public.sincronizar_acceso();


-- ---------------------------------------------------------------------
-- Permisos sobre el contenido. Se evalúan con el usuario del JWT (auth.uid()):
-- el backend tiene que llamarlas con el token del usuario, no con la service role.
-- ---------------------------------------------------------------------
create function public.tiene_acceso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.cursos c where c.id = p_curso_id and c.publicado and c.precio = 0)
    or exists (
      select 1 from public.accesos a
      where a.curso_id = p_curso_id
        and a.usuario_id = auth.uid()
        and a.revocado_at is null
        and (a.vence_at is null or a.vence_at > now())
    )
    or public.es_admin();
$$;

create function public.puede_ver_clase(p_clase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clases cl
    where cl.id = p_clase_id
      and (cl.muestra or public.tiene_acceso(cl.curso_id))
  );
$$;


-- ---------------------------------------------------------------------
-- Progreso por clase (reemplaza al localStorage de useProgreso)
-- ---------------------------------------------------------------------
create table public.progreso (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  clase_id uuid not null references public.clases (id) on delete cascade,
  posicion_segundos int not null default 0 check (posicion_segundos >= 0),  -- para retomar el video
  completada_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (usuario_id, clase_id)
);

create index progreso_clase_idx on public.progreso (clase_id);

create trigger progreso_updated_at before update on public.progreso
  for each row execute function public.set_updated_at();

-- Resumen por curso del usuario actual: { curso_id, total_clases, completadas, ultima_actividad }.
create view public.progreso_por_curso
with (security_invoker = true)
as
select
  cl.curso_id,
  count(cl.id)::int as total_clases,
  count(p.completada_at)::int as completadas,
  max(p.updated_at) as ultima_actividad
from public.clases cl
left join public.progreso p on p.clase_id = cl.id and p.usuario_id = auth.uid()
where cl.publicada
group by cl.curso_id;


-- ---------------------------------------------------------------------
-- Eventos de pago (webhooks). Sirve para no procesar dos veces el mismo
-- aviso y para auditar. PRIVADO: solo el backend.
-- ---------------------------------------------------------------------
create table public.eventos_pago (
  id bigint generated always as identity primary key,
  proveedor text not null default 'mercadopago',
  evento_id text not null,
  tipo text,
  payload jsonb not null,
  compra_id uuid references public.compras (id) on delete set null,
  procesado_at timestamptz,
  error text,
  recibido_at timestamptz not null default now(),
  unique (proveedor, evento_id)
);

create index eventos_pago_compra_idx on public.eventos_pago (compra_id);


-- ---------------------------------------------------------------------
-- Turnos: registro mínimo de lo reservado en DrApp (DrApp es la fuente de verdad).
-- Minimización de datos: el nombre del paciente, su fecha de nacimiento y el
-- detalle de la consulta van SOLO a DrApp; acá no se guardan.
-- ---------------------------------------------------------------------
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  drapp_id text unique,
  usuario_id uuid references public.perfiles (id) on delete set null,  -- si reservó con sesión iniciada
  fecha date not null,
  hora time not null,
  motivo text not null check (motivo in ('control', 'enfermedad', 'adolescencia', 'primera')),
  estado public.estado_turno not null default 'reservado',
  responsable_nombre text not null,
  telefono text not null,
  email text not null,
  confirmacion_enviada_at timestamptz,
  -- Consentimiento para tratar los datos (Ley 25.326): qué versión de la política aceptó y cuándo.
  consentimiento_version text not null,
  consentimiento_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index turnos_fecha_idx on public.turnos (fecha);
create index turnos_usuario_idx on public.turnos (usuario_id);


-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.perfiles enable row level security;
alter table public.cursos enable row level security;
alter table public.clases enable row level security;
alter table public.clases_medios enable row level security;
alter table public.compras enable row level security;
alter table public.accesos enable row level security;
alter table public.progreso enable row level security;
alter table public.eventos_pago enable row level security;
alter table public.turnos enable row level security;

-- Tablas solo del backend: además de no tener políticas, se les quitan los permisos.
revoke all on public.clases_medios, public.eventos_pago from anon, authenticated;

-- Perfiles: cada uno ve y edita el suyo. El rol no se puede cambiar desde el frontend.
create policy "perfiles: ver el propio" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

create policy "perfiles: editar el propio" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, update, delete on public.perfiles from anon, authenticated;
grant update (nombre, telefono, acepto_terminos_version, acepto_terminos_at) on public.perfiles to authenticated;

-- Cursos y clases: lectura pública de lo publicado (el catálogo se ve sin cuenta).
create policy "cursos: ver publicados" on public.cursos
  for select to anon, authenticated
  using (publicado or (select public.es_admin()));

create policy "clases: ver publicadas" on public.clases
  for select to anon, authenticated
  using (
    (publicada and exists (select 1 from public.cursos c where c.id = curso_id and c.publicado))
    or (select public.es_admin())
  );

-- Compras y accesos: cada usuario ve los suyos. Escribe solo el backend.
create policy "compras: ver las propias" on public.compras
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "accesos: ver los propios" on public.accesos
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Progreso: el usuario lo guarda directo desde el frontend, solo en clases que puede ver.
create policy "progreso: ver el propio" on public.progreso
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "progreso: crear el propio" on public.progreso
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.puede_ver_clase(clase_id));

create policy "progreso: actualizar el propio" on public.progreso
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and public.puede_ver_clase(clase_id));

-- Turnos: quien reservó con sesión iniciada ve los suyos. Crea solo el backend.
create policy "turnos: ver los propios" on public.turnos
  for select to authenticated
  using (usuario_id = (select auth.uid()));
