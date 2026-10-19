-- =====================================================================
-- Felicitas · panel de administración
--
-- Los administradores (perfiles.rol = 'admin', se asigna desde el panel de
-- Supabase) gestionan cursos, clases, materiales, cupones, contenido y accesos
-- desde la web con su sesión: estas políticas lo permiten solo si es_admin().
-- Los PDF pasan a Supabase Storage (bucket privado "materiales"); los videos
-- siguen en Bunny Stream.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Cursos y clases: escritura para administradores
-- ---------------------------------------------------------------------
create policy "cursos: admin crea" on public.cursos
  for insert to authenticated with check ((select public.es_admin()));
create policy "cursos: admin edita" on public.cursos
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "cursos: admin borra" on public.cursos
  for delete to authenticated using ((select public.es_admin()));

create policy "clases: admin crea" on public.clases
  for insert to authenticated with check ((select public.es_admin()));
create policy "clases: admin edita" on public.clases
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "clases: admin borra" on public.clases
  for delete to authenticated using ((select public.es_admin()));

-- Medios: siguen sin ser visibles para alumnos; el admin ve y edita qué archivo tiene cada clase.
grant select, insert, update, delete on public.clases_medios to authenticated;
create policy "medios: admin" on public.clases_medios
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));


-- ---------------------------------------------------------------------
-- Ventas, accesos, turnos, certificados y arrepentimientos: lectura para admin
-- ---------------------------------------------------------------------
create policy "compras: admin ve todas" on public.compras
  for select to authenticated using ((select public.es_admin()));

create policy "accesos: admin ve todos" on public.accesos
  for select to authenticated using ((select public.es_admin()));
create policy "accesos: admin da acceso" on public.accesos
  for insert to authenticated with check ((select public.es_admin()) and origen = 'manual');
create policy "accesos: admin edita" on public.accesos
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "turnos: admin ve todos" on public.turnos
  for select to authenticated using ((select public.es_admin()));

create policy "certificados: admin ve todos" on public.certificados
  for select to authenticated using ((select public.es_admin()));

grant select, update on public.arrepentimientos to authenticated;
create policy "arrepentimientos: admin ve" on public.arrepentimientos
  for select to authenticated using ((select public.es_admin()));
create policy "arrepentimientos: admin atiende" on public.arrepentimientos
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));


-- ---------------------------------------------------------------------
-- Cupones, testimonios y obras sociales: gestión completa para admin
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.cupones to authenticated;
create policy "cupones: admin" on public.cupones
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "testimonios: admin crea" on public.testimonios
  for insert to authenticated with check ((select public.es_admin()));
create policy "testimonios: admin edita" on public.testimonios
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "testimonios: admin borra" on public.testimonios
  for delete to authenticated using ((select public.es_admin()));

create policy "obras sociales: admin crea" on public.obras_sociales
  for insert to authenticated with check ((select public.es_admin()));
create policy "obras sociales: admin edita" on public.obras_sociales
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "obras sociales: admin borra" on public.obras_sociales
  for delete to authenticated using ((select public.es_admin()));


-- ---------------------------------------------------------------------
-- Usuarios con su email (el email vive en auth.users, que no se expone)
-- ---------------------------------------------------------------------
create function public.admin_usuarios()
returns table (id uuid, email text, nombre text, telefono text, rol public.rol_usuario, creado_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  return query
    select u.id, u.email::text, p.nombre, p.telefono, p.rol, u.created_at
    from auth.users u
    join public.perfiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_usuarios() from public, anon;
grant execute on function public.admin_usuarios() to authenticated;

-- Ventas por curso (aprobadas) y usos de cada cupón, para los listados del panel.
create function public.admin_resumen_ventas()
returns table (curso_id uuid, vendidas bigint, recaudado numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  return query
    select c.curso_id, count(*), coalesce(sum(c.monto), 0)
    from public.compras c
    where c.estado = 'aprobada'
    group by c.curso_id;
end;
$$;

revoke execute on function public.admin_resumen_ventas() from public, anon;
grant execute on function public.admin_resumen_ventas() to authenticated;


-- Mueve una clase un lugar arriba (-1) o abajo (+1) intercambiando el orden con su vecina,
-- en una sola transacción (el orden es único por curso).
create function public.admin_mover_clase(p_clase_id uuid, p_direccion int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clase public.clases;
  v_vecina public.clases;
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  select * into v_clase from public.clases where id = p_clase_id;
  if not found then
    raise exception 'No encontramos la clase.';
  end if;

  if p_direccion < 0 then
    select * into v_vecina from public.clases
    where curso_id = v_clase.curso_id and orden < v_clase.orden order by orden desc limit 1;
  else
    select * into v_vecina from public.clases
    where curso_id = v_clase.curso_id and orden > v_clase.orden order by orden asc limit 1;
  end if;
  if not found then
    return; -- ya está en el extremo
  end if;

  set constraints all deferred;
  update public.clases set orden = v_vecina.orden where id = v_clase.id;
  update public.clases set orden = v_clase.orden where id = v_vecina.id;
end;
$$;

revoke execute on function public.admin_mover_clase(uuid, int) from public, anon;
grant execute on function public.admin_mover_clase(uuid, int) to authenticated;


-- ---------------------------------------------------------------------
-- PDF de los cursos en Supabase Storage: bucket privado, solo PDF, hasta 50 MB.
-- El admin sube y borra con su sesión; los alumnos reciben links firmados del backend.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiales', 'materiales', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy "materiales: admin ve" on storage.objects
  for select to authenticated using (bucket_id = 'materiales' and (select public.es_admin()));
create policy "materiales: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'materiales' and (select public.es_admin()));
create policy "materiales: admin reemplaza" on storage.objects
  for update to authenticated using (bucket_id = 'materiales' and (select public.es_admin()));
create policy "materiales: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'materiales' and (select public.es_admin()));
