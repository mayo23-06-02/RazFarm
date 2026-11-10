-- Manual batch costs (firewood, transport, labour, other) and a tenant
-- vaccination template copied onto each batch at placement.

create type public.poultry_task_status as enum ('pending', 'done');

create table public.poultry_health_protocols (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  day_of_age integer not null check (day_of_age between 0 and 60),
  name text not null check (char_length(name) between 2 and 80),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.poultry_batch_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  batch_id uuid not null references public.poultry_batches (id) on delete cascade,
  protocol_id uuid references public.poultry_health_protocols (id) on delete set null,
  name text not null,
  day_of_age integer not null check (day_of_age >= 0),
  due_on date not null,
  status public.poultry_task_status not null default 'pending',
  done_on date,
  inventory_item_id uuid references public.inventory_items (id),
  quantity numeric(12, 2) check (quantity is null or quantity >= 0),
  stock_movement_id uuid references public.stock_movements (id),
  created_at timestamptz not null default now()
);

create index poultry_health_protocols_tenant_idx on public.poultry_health_protocols (tenant_id, sort_order);
create index poultry_batch_tasks_batch_idx on public.poultry_batch_tasks (batch_id, due_on);
create index poultry_batch_tasks_tenant_idx on public.poultry_batch_tasks (tenant_id, status, due_on);

alter table public.poultry_health_protocols enable row level security;
alter table public.poultry_batch_tasks enable row level security;

create policy poultry_health_protocols_select on public.poultry_health_protocols
  for select using (public.jwt_is_poultry_viewer(tenant_id));
create policy poultry_health_protocols_write on public.poultry_health_protocols
  for all using (public.jwt_is_poultry_manager(tenant_id))
  with check (public.jwt_is_poultry_manager(tenant_id));

create policy poultry_batch_tasks_select on public.poultry_batch_tasks
  for select using (public.jwt_is_poultry_viewer(tenant_id));

create trigger set_poultry_health_protocols_updated_at
  before update on public.poultry_health_protocols
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.poultry_health_protocols to authenticated;
grant select on public.poultry_batch_tasks to authenticated;

-- ============================================================================
-- Default template. Idempotent. Called when a poultry page loads, and below
-- for farms that already exist.
-- ============================================================================

create or replace function public.seed_poultry_health_template(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.jwt_is_poultry_manager(p_tenant_id) then
    raise exception 'Only the farm owner or supervisor can edit the vaccination template';
  end if;
  if exists (select 1 from public.poultry_health_protocols where tenant_id = p_tenant_id) then
    return;
  end if;

  insert into public.poultry_health_protocols (tenant_id, day_of_age, name, sort_order)
  values
    (p_tenant_id, 7, 'Newcastle', 1),
    (p_tenant_id, 14, 'Gumboro', 2),
    (p_tenant_id, 21, 'Newcastle booster', 3);
end;
$$;

grant execute on function public.seed_poultry_health_template(uuid) to authenticated;

insert into public.poultry_health_protocols (tenant_id, day_of_age, name, sort_order)
select t.id, v.day_of_age, v.name, v.sort_order
from public.tenants t
cross join (
  values (7, 'Newcastle', 1), (14, 'Gumboro', 2), (21, 'Newcastle booster', 3)
) as v(day_of_age, name, sort_order)
where t.enterprise_kind in ('poultry_farm', 'mixed')
on conflict (tenant_id, name) do nothing;

-- Copy the template onto every new batch. Status uses the column default.
create or replace function public.copy_poultry_health_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.poultry_batch_tasks (tenant_id, batch_id, protocol_id, name, day_of_age, due_on)
  select new.tenant_id, new.id, p.id, p.name, p.day_of_age, new.placed_on + p.day_of_age
  from public.poultry_health_protocols p
  where p.tenant_id = new.tenant_id and p.active
  order by p.sort_order, p.day_of_age;
  return new;
end;
$$;

create trigger poultry_batches_copy_health_tasks
  after insert on public.poultry_batches
  for each row execute function public.copy_poultry_health_tasks();

-- Batches placed before this migration still need their tasks.
insert into public.poultry_batch_tasks (tenant_id, batch_id, protocol_id, name, day_of_age, due_on)
select b.tenant_id, b.id, p.id, p.name, p.day_of_age, b.placed_on + p.day_of_age
from public.poultry_batches b
join public.poultry_health_protocols p on p.tenant_id = b.tenant_id and p.active
where b.status = 'active'
  and not exists (
  select 1 from public.poultry_batch_tasks t
  where t.batch_id = b.id and t.protocol_id = p.id
);

-- ============================================================================
-- Manual cost. Chicks and feed stay on their own RPCs.
-- ============================================================================

create or replace function public.add_poultry_batch_cost(
  p_batch_id uuid,
  p_category public.poultry_cost_category,
  p_cost_date date,
  p_amount numeric,
  p_note text,
  p_payment_account_id uuid
)
returns public.poultry_batch_costs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.poultry_batches%rowtype;
  v_code text;
  v_name text;
  v_account uuid;
  v_entry_id uuid;
  v_cost public.poultry_batch_costs%rowtype;
  v_note text := nullif(btrim(p_note), '');
begin
  select * into v_batch from public.poultry_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if not public.jwt_is_poultry_manager(v_batch.tenant_id) then
    raise exception 'Only the farm owner or supervisor can add a cost';
  end if;
  if v_batch.status <> 'active' then
    raise exception 'This batch is closed';
  end if;
  if p_category not in ('firewood', 'transport', 'labour', 'other') then
    raise exception 'Chicks, feed and vaccines are recorded on their own screens';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount';
  end if;
  if p_cost_date < v_batch.placed_on or p_cost_date > current_date then
    raise exception 'The cost date has to fall in this batch';
  end if;
  if v_note is null then
    raise exception 'Add a short note';
  end if;
  if p_payment_account_id is null or not exists (
    select 1 from public.accounts a
    where a.id = p_payment_account_id and a.tenant_id = v_batch.tenant_id
  ) then
    raise exception 'Choose the cash or bank account this was paid from';
  end if;

  v_code := case p_category
    when 'firewood' then '5450'
    when 'transport' then '5460'
    when 'labour' then '5470'
    else '5480'
  end;
  v_name := case p_category
    when 'firewood' then 'Brooding fuel'
    when 'transport' then 'Poultry transport'
    when 'labour' then 'Poultry labour'
    else 'Poultry other costs'
  end;
  v_account := public.ensure_named_account(v_batch.tenant_id, v_code, v_name, 'expense');

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (
    v_batch.tenant_id,
    'CST-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    p_cost_date,
    v_batch.batch_no || ' ' || v_note,
    'posted', auth.uid(), auth.uid(), now()
  )
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_account, v_note, p_amount, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, p_payment_account_id, v_note, p_amount, 1);

  insert into public.poultry_batch_costs (
    tenant_id, batch_id, cost_date, category, description, amount, journal_entry_id, source, source_id, created_by
  ) values (
    v_batch.tenant_id, p_batch_id, p_cost_date, p_category, v_note, p_amount, v_entry_id, 'manual', p_batch_id, auth.uid()
  )
  returning * into v_cost;

  return v_cost;
end;
$$;

grant execute on function public.add_poultry_batch_cost(uuid, public.poultry_cost_category, date, numeric, text, uuid) to authenticated;

-- ============================================================================
-- Mark a vaccination done. Optional stock issue of a vaccine or medication.
-- ============================================================================

create or replace function public.complete_poultry_task(
  p_task_id uuid,
  p_item_id uuid default null,
  p_quantity numeric default null
)
returns public.poultry_batch_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.poultry_batch_tasks%rowtype;
  v_batch public.poultry_batches%rowtype;
  v_item public.inventory_items%rowtype;
  v_account uuid;
  v_movement public.stock_movements%rowtype;
  v_qty numeric(12, 2) := coalesce(p_quantity, 0);
begin
  select * into v_task from public.poultry_batch_tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;
  if not public.jwt_is_poultry_manager(v_task.tenant_id) then
    raise exception 'Only the farm owner or supervisor can mark a vaccination done';
  end if;
  if v_task.status <> 'pending' then
    raise exception 'This vaccination is already done';
  end if;

  select * into v_batch from public.poultry_batches where id = v_task.batch_id for update;
  if v_batch.status <> 'active' then
    raise exception 'This batch is closed';
  end if;

  if v_qty < 0 then
    raise exception 'Quantity can''t be negative';
  end if;

  if v_qty > 0 then
    select * into v_item from public.inventory_items where id = p_item_id;
    if not found or v_item.tenant_id <> v_task.tenant_id then
      raise exception 'Choose a vaccine on this farm';
    end if;
    if v_item.category not in ('vaccine', 'medication') then
      raise exception 'That item is not a vaccine or medication';
    end if;
    v_account := public.ensure_named_account(v_task.tenant_id, '5430', 'Poultry health', 'expense');
    v_movement := public.apply_stock_issue(
      p_item_id,
      v_qty,
      v_account,
      v_batch.batch_no || ' ' || v_task.name,
      current_date
    );
    insert into public.poultry_batch_costs (
      tenant_id, batch_id, cost_date, category, description, amount,
      inventory_item_id, stock_movement_id, journal_entry_id, source, source_id, created_by
    ) values (
      v_task.tenant_id, v_batch.id, current_date, 'vaccine',
      v_task.name || ' — ' || v_item.name,
      round(v_qty * v_movement.unit_cost, 2),
      p_item_id, v_movement.id, v_movement.journal_entry_id, 'health', v_task.id, auth.uid()
    );
  end if;

  update public.poultry_batch_tasks
  set status = 'done',
      done_on = current_date,
      inventory_item_id = case when v_qty > 0 then p_item_id else null end,
      quantity = case when v_qty > 0 then v_qty else null end,
      stock_movement_id = v_movement.id
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

grant execute on function public.complete_poultry_task(uuid, uuid, numeric) to authenticated;

-- Expense accounts used by the new costs, so the chart is ready before the first entry.
create or replace function public.seed_poultry_accounts(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.jwt_is_poultry_manager(p_tenant_id)
    or public.jwt_is_accountant(p_tenant_id)
  ) then
    raise exception 'Only the farm owner or accountant can set up poultry accounts';
  end if;

  perform public.ensure_named_account(p_tenant_id, '1000', 'Bank', 'asset');
  perform public.ensure_named_account(p_tenant_id, '1010', 'Cash on hand', 'asset');
  perform public.ensure_named_account(p_tenant_id, '1300', 'Inventory', 'asset');
  perform public.ensure_named_account(p_tenant_id, '4100', 'Live bird sales', 'income');
  perform public.ensure_named_account(p_tenant_id, '5410', 'Day-old chicks', 'expense');
  perform public.ensure_named_account(p_tenant_id, '5420', 'Poultry feed', 'expense');
  perform public.ensure_named_account(p_tenant_id, '5430', 'Poultry health', 'expense');
  perform public.ensure_named_account(p_tenant_id, '5450', 'Brooding fuel', 'expense');
  perform public.ensure_named_account(p_tenant_id, '5460', 'Poultry transport', 'expense');
  perform public.ensure_named_account(p_tenant_id, '5470', 'Poultry labour', 'expense');
  perform public.ensure_named_account(p_tenant_id, '5480', 'Poultry other costs', 'expense');
end;
$$;
