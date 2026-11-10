-- Move an active batch from the brooder (no pen) into a pen in the same house,
-- or from one pen to another in that house. Bird counts do not change.

create or replace function public.move_poultry_batch(
  p_batch_id uuid,
  p_pen_id uuid
)
returns public.poultry_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.poultry_batches%rowtype;
  v_pen public.poultry_pens%rowtype;
  v_alive integer;
  v_in_pen integer;
begin
  select * into v_batch from public.poultry_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if not public.jwt_is_poultry_manager(v_batch.tenant_id) then
    raise exception 'Only the farm owner or supervisor can move a batch';
  end if;
  if v_batch.status <> 'active' then
    raise exception 'This batch is closed';
  end if;

  select * into v_pen from public.poultry_pens where id = p_pen_id;
  if not found or v_pen.tenant_id <> v_batch.tenant_id or v_pen.house_id <> v_batch.house_id then
    raise exception 'That pen is not in this house';
  end if;
  if v_batch.pen_id = p_pen_id then
    return v_batch;
  end if;

  v_alive := public.poultry_birds_alive(p_batch_id);
  select coalesce(sum(public.poultry_birds_alive(b.id)), 0) into v_in_pen
  from public.poultry_batches b
  where b.pen_id = p_pen_id and b.status = 'active' and b.id <> p_batch_id;

  if v_in_pen + v_alive > v_pen.capacity_birds then
    raise exception 'Pen % holds % birds and already has %', v_pen.code, v_pen.capacity_birds, v_in_pen;
  end if;

  update public.poultry_batches
  set pen_id = p_pen_id, updated_at = now()
  where id = p_batch_id
  returning * into v_batch;

  return v_batch;
end;
$$;

grant execute on function public.move_poultry_batch(uuid, uuid) to authenticated;
