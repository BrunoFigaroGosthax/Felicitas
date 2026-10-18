-- =====================================================================
-- Felicitas · cupones de descuento, certificados, testimonios y obras sociales
--
-- Cupones: el backend crea la compra con crear_compra(), que valida el código
-- y calcula el precio final en la base (el frontend nunca manda el monto).
-- Certificados: el alumno los pide con emitir_certificado() al completar el
-- curso; cualquiera puede verificarlos con verificar_certificado(código).
-- Testimonios y obras sociales: se editan desde el panel de Supabase y la
-- web los lee sin necesidad de deploy.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Cupones de descuento. PRIVADO: solo el backend (que nadie pueda listar los códigos).
-- ---------------------------------------------------------------------
create type public.tipo_descuento as enum ('porcentaje', 'monto');

create table public.cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo = upper(codigo) and codigo ~ '^[A-Z0-9_-]{3,30}$'),
  descripcion text,                               -- uso interno, ej.: "Lanzamiento, Instagram"
  tipo public.tipo_descuento not null,
  valor numeric(12, 2) not null check (valor > 0),
  curso_id uuid references public.cursos (id) on delete cascade,  -- null = sirve para todos los cursos pagos
  valido_desde timestamptz,
  valido_hasta timestamptz,
  usos_maximos int check (usos_maximos > 0),      -- null = sin límite
  usos_por_usuario int default 1 check (usos_por_usuario > 0),  -- null = sin límite
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tipo <> 'porcentaje' or valor <= 100),
  check (valido_hasta is null or valido_desde is null or valido_hasta > valido_desde)
);

create index cupones_curso_idx on public.cupones (curso_id);

create trigger cupones_updated_at before update on public.cupones
  for each row execute function public.set_updated_at();

-- Las compras guardan el precio de lista, el descuento y el cupón usado.
alter table public.compras
  add column precio_lista numeric(12, 2) check (precio_lista >= 0),
  add column descuento numeric(12, 2) not null default 0 check (descuento >= 0),
  add column cupon_id uuid references public.cupones (id) on delete restrict,  -- un cupón usado se desactiva, no se borra
  add constraint compras_monto_cuadra check (precio_lista is null or monto = precio_lista - descuento);

create index compras_cupon_idx on public.compras (cupon_id);

-- Precio final de un curso con un código opcional. Avisa con un mensaje claro si el código no sirve.
-- Los usos se cuentan sobre compras aprobadas: dos compras simultáneas con el último uso
-- disponible podrían pasar las dos (aceptable para el volumen esperado).
create function public.calcular_precio(p_curso_id uuid, p_codigo text default null, p_usuario_id uuid default null)
returns table (precio_lista numeric, descuento numeric, monto numeric, cupon_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_precio numeric(12, 2);
  v_cupon public.cupones;
  v_usos int;
  v_descuento numeric(12, 2) := 0;
begin
  select c.precio into v_precio from public.cursos c where c.id = p_curso_id and c.publicado;
  if not found then
    raise exception 'No encontramos el curso.';
  end if;

  if nullif(btrim(p_codigo), '') is not null then
    select * into v_cupon from public.cupones cu where cu.codigo = upper(btrim(p_codigo));
    if not found or not v_cupon.activo
       or (v_cupon.valido_desde is not null and now() < v_cupon.valido_desde)
       or (v_cupon.valido_hasta is not null and now() > v_cupon.valido_hasta) then
      raise exception 'El código de descuento no es válido o ya venció.';
    end if;
    if v_cupon.curso_id is not null and v_cupon.curso_id <> p_curso_id then
      raise exception 'Este código no es para este curso.';
    end if;
    if v_cupon.usos_maximos is not null then
      select count(*) into v_usos from public.compras co
      where co.cupon_id = v_cupon.id and co.estado = 'aprobada';
      if v_usos >= v_cupon.usos_maximos then
        raise exception 'Este código ya no tiene usos disponibles.';
      end if;
    end if;
    if p_usuario_id is not null and v_cupon.usos_por_usuario is not null then
      select count(*) into v_usos from public.compras co
      where co.cupon_id = v_cupon.id and co.usuario_id = p_usuario_id and co.estado = 'aprobada';
      if v_usos >= v_cupon.usos_por_usuario then
        raise exception 'Ya usaste este código.';
      end if;
    end if;

    if v_cupon.tipo = 'porcentaje' then
      v_descuento := round(v_precio * v_cupon.valor / 100, 2);
    else
      v_descuento := least(v_cupon.valor, v_precio);
    end if;
  end if;

  return query select v_precio, v_descuento, v_precio - v_descuento, v_cupon.id;
end;
$$;

-- Crea la compra pendiente con el precio calculado. Con descuento del 100 % queda aprobada
-- al instante (proveedor 'sin_cargo') y el trigger da el acceso, sin pasar por Mercado Pago.
create function public.crear_compra(p_usuario_id uuid, p_curso_id uuid, p_codigo text default null)
returns public.compras
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_precio record;
  v_compra public.compras;
begin
  if exists (
    select 1 from public.accesos a
    where a.usuario_id = p_usuario_id and a.curso_id = p_curso_id and a.revocado_at is null
      and (a.vence_at is null or a.vence_at > now())
  ) then
    raise exception 'Ya tenés este curso.';
  end if;

  select * into v_precio from public.calcular_precio(p_curso_id, p_codigo, p_usuario_id);
  if v_precio.precio_lista = 0 then
    raise exception 'Este curso es gratis: no hace falta comprarlo.';
  end if;

  insert into public.compras (usuario_id, curso_id, precio_lista, descuento, monto, cupon_id, estado, proveedor)
  values (
    p_usuario_id, p_curso_id, v_precio.precio_lista, v_precio.descuento, v_precio.monto, v_precio.cupon_id,
    case when v_precio.monto = 0 then 'aprobada'::public.estado_compra else 'pendiente'::public.estado_compra end,
    case when v_precio.monto = 0 then 'sin_cargo' else 'mercadopago' end
  )
  returning * into v_compra;

  return v_compra;
end;
$$;


-- ---------------------------------------------------------------------
-- Certificados de finalización
-- ---------------------------------------------------------------------
alter table public.cursos add column otorga_certificado boolean not null default false;

create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  -- Código corto que va impreso en el certificado para verificarlo.
  codigo text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  usuario_id uuid references public.perfiles (id) on delete set null,
  curso_id uuid references public.cursos (id) on delete set null,
  -- Copias al momento de emitir: el certificado no cambia si después se edita el perfil o el curso.
  nombre_alumno text not null,
  curso_titulo text not null,
  emitido_at timestamptz not null default now(),
  unique (usuario_id, curso_id)
);

create index certificados_curso_idx on public.certificados (curso_id);

-- Emite (o devuelve, si ya existe) el certificado del usuario actual para un curso terminado.
create function public.emitir_certificado(p_curso_id uuid)
returns public.certificados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_curso public.cursos;
  v_faltan int;
  v_nombre text;
  v_cert public.certificados;
begin
  if v_uid is null then
    raise exception 'Iniciá sesión para obtener tu certificado.';
  end if;

  select * into v_cert from public.certificados c where c.usuario_id = v_uid and c.curso_id = p_curso_id;
  if found then
    return v_cert;
  end if;

  select * into v_curso from public.cursos c where c.id = p_curso_id and c.publicado;
  if not found or not v_curso.otorga_certificado then
    raise exception 'Este curso no otorga certificado.';
  end if;
  if not public.tiene_acceso(p_curso_id) then
    raise exception 'No tenés acceso a este curso.';
  end if;

  select count(*) into v_faltan from public.clases cl
  where cl.curso_id = p_curso_id and cl.publicada
    and not exists (
      select 1 from public.progreso p
      where p.clase_id = cl.id and p.usuario_id = v_uid and p.completada_at is not null
    );
  if v_faltan > 0 then
    raise exception 'Te % % para terminar el curso.',
      case when v_faltan = 1 then 'falta' else 'faltan' end,
      case when v_faltan = 1 then '1 clase' else v_faltan || ' clases' end;
  end if;

  select nullif(btrim(pf.nombre), '') into v_nombre from public.perfiles pf where pf.id = v_uid;
  if v_nombre is null then
    raise exception 'Completá tu nombre en el perfil: es el que figura en el certificado.';
  end if;

  insert into public.certificados (usuario_id, curso_id, nombre_alumno, curso_titulo)
  values (v_uid, p_curso_id, v_nombre, v_curso.titulo)
  returning * into v_cert;

  return v_cert;
end;
$$;

-- Verificación pública: con el código impreso, muestra a quién y por qué curso se emitió.
create function public.verificar_certificado(p_codigo text)
returns table (nombre_alumno text, curso_titulo text, emitido_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.nombre_alumno, c.curso_titulo, c.emitido_at
  from public.certificados c
  where c.codigo = upper(btrim(p_codigo));
$$;


-- ---------------------------------------------------------------------
-- Testimonios (publicar solo con permiso de la familia)
-- ---------------------------------------------------------------------
create table public.testimonios (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  autor text not null,                            -- como se muestra, ej.: "Laura, mamá de Tomás"
  curso_id uuid references public.cursos (id) on delete set null,  -- null = testimonio general (home)
  permiso_at date not null,                       -- cuándo dio el permiso para publicarlo
  permiso_detalle text,                           -- cómo se obtuvo, ej.: "Por WhatsApp, captura guardada"
  publicado boolean not null default false,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index testimonios_curso_idx on public.testimonios (curso_id);

create trigger testimonios_updated_at before update on public.testimonios
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Obras sociales con las que atiende (home y formulario de turnos).
-- "Particular" no va acá: lo agrega el formulario.
-- ---------------------------------------------------------------------
create table public.obras_sociales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activa boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger obras_sociales_updated_at before update on public.obras_sociales
  for each row execute function public.set_updated_at();


-- =====================================================================
-- Seguridad
-- =====================================================================
alter table public.cupones enable row level security;
alter table public.certificados enable row level security;
alter table public.testimonios enable row level security;
alter table public.obras_sociales enable row level security;

-- Cupones: privados.
revoke all on public.cupones from anon, authenticated;

-- Certificados: cada uno ve los suyos; se crean solo con emitir_certificado().
create policy "certificados: ver los propios" on public.certificados
  for select to authenticated
  using (usuario_id = (select auth.uid()));
revoke insert, update, delete on public.certificados from anon, authenticated;

-- Testimonios y obras sociales: lectura pública de lo publicado / activo.
create policy "testimonios: ver publicados" on public.testimonios
  for select to anon, authenticated
  using (publicado or (select public.es_admin()));

create policy "obras sociales: ver activas" on public.obras_sociales
  for select to anon, authenticated
  using (activa or (select public.es_admin()));

-- Funciones: precios y compras, solo el backend. Certificados, como se indica.
revoke execute on function public.calcular_precio(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.crear_compra(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.emitir_certificado(uuid) from public, anon;
grant execute on function public.emitir_certificado(uuid) to authenticated;
grant execute on function public.verificar_certificado(text) to anon, authenticated;
