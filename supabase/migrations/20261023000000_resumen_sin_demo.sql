-- Felicitas · el resumen de ventas del panel no cuenta las compras de demostración (PAGOS_DEMO).
create or replace function public.admin_resumen_ventas()
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
    where c.estado = 'aprobada' and c.proveedor <> 'demo'
    group by c.curso_id;
end;
$$;
