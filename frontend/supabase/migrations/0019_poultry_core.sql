-- Slim broiler module: houses, pens, batches, daily logs, cash sales.
-- Bird counts are derived. Stock leaves the store only through apply_stock_issue,
-- which record_stock_issue and the daily log both call.
--
-- Out of this migration on purpose: vaccination templates, alerts, manual
-- cost lines other than chicks and feed, and moving a batch between pens.

-- ============================================================================
-- 1. Role helpers. Chairman (the registering owner) can run a poultry farm.
--    Cane chairmen are not included: the tenant must be poultry_farm or mixed.
-- ============================================================================

create or replace function public.jwt_is_poultry_viewer(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select public.jwt_has_role(
    p_tenant_id,
    array['chairman', 'treasurer', 'accountant', 'supervisor']::public.member_role[]
  )
  and exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.enterprise_kind in ('poultry_farm', 'mixed')
  );
$$;

create or replace function public.jwt_is_poultry_manager(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'supervisor']::public.member_role[])
  and exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.enterprise_kind in ('poultry_farm', 'mixed')
  );
$$;

-- ============================================================================
-- 2. Tables
-- ============================================================================

create type public.poultry_house_type as enum ('brooder', 'growout', 'combined');
create type public.poultry_house_status as enum ('active', 'inactive');
create type public.poultry_batch_status as enum ('active', 'closed');
create type public.poultry_cost_category as enum ('chicks', 'feed');
create type public.poultry_cost_source as enum ('placement', 'daily_log');

create table public.poultry_houses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 1 and 120),
  house_type public.poultry_house_type not null default 'combined',
  capacity_birds integer not null check (capacity_birds > 0),
  status public.poultry_house_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.poultry_pens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  house_id uuid not null references public.poultry_houses (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 1 and 120),
  capacity_birds integer not null check (capacity_birds > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (house_id, code)
);

create table public.poultry_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  batch_no text not null check (char_length(batch_no) between 1 and 30),
  status public.poultry_batch_status not null default 'active',
  placed_on date not null,
  closed_on date,
  house_id uuid not null references public.poultry_houses (id),
  pen_id uuid references public.poultry_pens (id),
  supplier_id uuid references public.suppliers (id) on delete set null,
  chick_boxes integer not null default 0 check (chick_boxes >= 0),
  birds_placed integer not null check (birds_placed > 0),
  birds_doa integer not null default 0 check (birds_doa >= 0),
  birds_written_off integer not null default 0 check (birds_written_off >= 0),
  chick_cost numeric(14, 2) not null default 0 check (chick_cost >= 0),
  breed text,
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, batch_no),
  check (birds_doa <= birds_placed),
  check (closed_on is null or closed_on >= placed_on)
);

create table public.poultry_daily_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  batch_id uuid not null references public.poultry_batches (id) on delete cascade,
  log_date date not null,
  mortality integer not null default 0 check (mortality >= 0),
  culls integer not null default 0 check (culls >= 0),
  feed_item_id uuid references public.inventory_items (id),
  feed_quantity numeric(12, 2) not null default 0 check (feed_quantity >= 0),
  temp_min_c numeric(4, 1),
  temp_max_c numeric(4, 1),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, log_date),
  check (temp_max_c is null or temp_min_c is null or temp_max_c >= temp_min_c)
);

create table public.poultry_sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  batch_id uuid not null references public.poultry_batches (id) on delete cascade,
  sale_date date not null,
  birds integer not null check (birds > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  buyer_name text,
  payment_account_id uuid not null references public.accounts (id),
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (total_amount = round(birds * unit_price, 2))
);

create table public.poultry_batch_costs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  batch_id uuid not null references public.poultry_batches (id) on delete cascade,
  cost_date date not null,
  category public.poultry_cost_category not null,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  inventory_item_id uuid references public.inventory_items (id),
  stock_movement_id uuid references public.stock_movements (id),
  journal_entry_id uuid references public.journal_entries (id),
  source public.poultry_cost_source not null,
  source_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create unique index poultry_batch_costs_movement_uidx
  on public.poultry_batch_costs (stock_movement_id)
  where stock_movement_id is not null;

create index poultry_houses_tenant_idx on public.poultry_houses (tenant_id);
create index poultry_pens_house_idx on public.poultry_pens (house_id);
create index poultry_batches_tenant_idx on public.poultry_batches (tenant_id, status);
create index poultry_daily_logs_batch_idx on public.poultry_daily_logs (batch_id, log_date desc);
create index poultry_sales_batch_idx on public.poultry_sales (batch_id, sale_date desc);
create index poultry_batch_costs_batch_idx on public.poultry_batch_costs (batch_id);

-- ============================================================================
-- 3. RLS
-- ============================================================================

alter table public.poultry_houses enable row level security;
alter table public.poultry_pens enable row level security;
alter table public.poultry_batches enable row level security;
alter table public.poultry_daily_logs enable row level security;
alter table public.poultry_sales enable row level security;
alter table public.poultry_batch_costs enable row level security;

create policy poultry_houses_select on public.poultry_houses
  for select using (public.jwt_is_poultry_viewer(tenant_id));
create policy poultry_houses_write on public.poultry_houses
  for all using (public.jwt_is_poultry_manager(tenant_id))
  with check (public.jwt_is_poultry_manager(tenant_id));

create policy poultry_pens_select on public.poultry_pens
  for select using (public.jwt_is_poultry_viewer(tenant_id));
create policy poultry_pens_write on public.poultry_pens
  for all using (public.jwt_is_poultry_manager(tenant_id))
  with check (public.jwt_is_poultry_manager(tenant_id));

create policy poultry_batches_select on public.poultry_batches
  for select using (public.jwt_is_poultry_viewer(tenant_id));
create policy poultry_daily_logs_select on public.poultry_daily_logs
  for select using (public.jwt_is_poultry_viewer(tenant_id));
create policy poultry_sales_select on public.poultry_sales
  for select using (public.jwt_is_poultry_viewer(tenant_id));
create policy poultry_batch_costs_select on public.poultry_batch_costs
  for select using (public.jwt_is_poultry_viewer(tenant_id));

-- A poultry chairman is not an inventory manager. Let them add feed items
-- and hatcheries on a poultry tenant only. Stock quantities still move
-- through the receipt/issue RPCs, not through these policies.
create policy suppliers_insert_poultry on public.suppliers
  for insert with check (public.jwt_is_poultry_manager(tenant_id));
create policy suppliers_update_poultry on public.suppliers
  for update using (public.jwt_is_poultry_manager(tenant_id))
  with check (public.jwt_is_poultry_manager(tenant_id));

create policy inventory_items_insert_poultry on public.inventory_items
  for insert with check (public.jwt_is_poultry_manager(tenant_id));
create policy inventory_items_update_poultry on public.inventory_items
  for update using (public.jwt_is_poultry_manager(tenant_id))
  with check (public.jwt_is_poultry_manager(tenant_id));

create trigger set_poultry_houses_updated_at
  before update on public.poultry_houses
  for each row execute function public.set_updated_at();
create trigger set_poultry_pens_updated_at
  before update on public.poultry_pens
  for each row execute function public.set_updated_at();
create trigger set_poultry_batches_updated_at
  before update on public.poultry_batches
  for each row execute function public.set_updated_at();
create trigger set_poultry_daily_logs_updated_at
  before update on public.poultry_daily_logs
  for each row execute function public.set_updated_at();

create trigger audit_poultry_batches
  after insert or update or delete on public.poultry_batches
  for each row execute function public.audit_row_change();
create trigger audit_poultry_daily_logs
  after insert or update or delete on public.poultry_daily_logs
  for each row execute function public.audit_row_change();
create trigger audit_poultry_sales
  after insert or update or delete on public.poultry_sales
  for each row execute function public.audit_row_change();
create trigger audit_poultry_batch_costs
  after insert or update or delete on public.poultry_batch_costs
  for each row execute function public.audit_row_change();

create or replace function public.poultry_pen_same_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.poultry_houses h
    where h.id = new.house_id and h.tenant_id = new.tenant_id
  ) then
    raise exception 'That pen is not in this house';
  end if;
  return new;
end;
$$;

create trigger poultry_pens_same_tenant
  before insert or update on public.poultry_pens
  for each row execute function public.poultry_pen_same_tenant();

-- ============================================================================
-- 4. Derived bird count. security invoker so a direct call still hits RLS.
-- ============================================================================

create or replace function public.poultry_birds_alive(p_batch_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select (
    b.birds_placed
    - b.birds_doa
    - b.birds_written_off
    - coalesce((select sum(l.mortality + l.culls) from public.poultry_daily_logs l where l.batch_id = b.id), 0)
    - coalesce((select sum(s.birds) from public.poultry_sales s where s.batch_id = b.id), 0)
  )::integer
  from public.poultry_batches b
  where b.id = p_batch_id;
$$;

grant execute on function public.poultry_birds_alive(uuid) to authenticated;

-- ============================================================================
-- 5. Ledger helpers and the internal stock issue
-- ============================================================================

create or replace function public.ensure_named_account(
  p_tenant_id uuid,
  p_code text,
  p_name text,
  p_type public.account_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select id into v_account_id from public.accounts where tenant_id = p_tenant_id and code = p_code;
  if not found then
    insert into public.accounts (tenant_id, code, name, type)
    values (p_tenant_id, p_code, p_name, p_type)
    returning id into v_account_id;
  end if;
  return v_account_id;
end;
$$;

revoke all on function public.ensure_named_account(uuid, text, text, public.account_type) from public, anon, authenticated;

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
end;
$$;

grant execute on function public.seed_poultry_accounts(uuid) to authenticated;

-- No role check. Callers (record_stock_issue and the daily-log RPC) check
-- the role themselves. Revoked from app roles so it is not an RPC.
create or replace function public.apply_stock_issue(
  p_item_id uuid,
  p_quantity numeric,
  p_expense_account_id uuid,
  p_reference text,
  p_entry_date date default current_date
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_inventory_account_id uuid;
  v_cost numeric(14, 2);
  v_entry_id uuid;
  v_movement public.stock_movements%rowtype;
begin
  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if p_quantity <= 0 then
    raise exception 'The quantity issued must be positive';
  end if;
  if p_expense_account_id is null then
    raise exception 'Choose what this stock was used for';
  end if;
  if not exists (
    select 1 from public.accounts a
    where a.id = p_expense_account_id and a.tenant_id = v_item.tenant_id
  ) then
    raise exception 'That account is not on this farm';
  end if;
  if p_quantity > v_item.quantity_on_hand then
    raise exception 'Can''t issue % — only % % in stock', p_quantity, v_item.quantity_on_hand, v_item.unit;
  end if;

  v_cost := round(p_quantity * v_item.average_cost, 2);
  v_inventory_account_id := public.ensure_inventory_account(v_item.tenant_id);

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (
    v_item.tenant_id,
    'STK-I-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    coalesce(p_entry_date, current_date),
    coalesce(p_reference, 'Stock issued — ' || v_item.name),
    'posted', auth.uid(), auth.uid(), now()
  )
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, p_expense_account_id, 'Stock issued — ' || v_item.name, v_cost, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_inventory_account_id, 'Stock issued — ' || v_item.name, v_cost, 1);

  update public.inventory_items
  set quantity_on_hand = quantity_on_hand - p_quantity, updated_at = now()
  where id = p_item_id;

  insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, journal_entry_id, created_by)
  values (v_item.tenant_id, p_item_id, 'issue', -p_quantity, v_item.average_cost, p_reference, v_entry_id, auth.uid())
  returning * into v_movement;

  return v_movement;
end;
$$;

revoke all on function public.apply_stock_issue(uuid, numeric, uuid, text, date) from public, anon, authenticated;

create or replace function public.record_stock_issue(
  p_item_id uuid,
  p_quantity numeric,
  p_expense_account_id uuid,
  p_reference text
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
begin
  select * into v_item from public.inventory_items where id = p_item_id;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if public.jwt_is_inventory_manager(v_item.tenant_id) then
    return public.apply_stock_issue(p_item_id, p_quantity, p_expense_account_id, p_reference, current_date);
  end if;
  if public.jwt_is_poultry_manager(v_item.tenant_id) then
    raise exception 'Issue feed from Poultry → Today so it is charged to a batch. Receive the bags under Inventory first.';
  end if;
  raise exception 'Only the accountant or supervisor can issue stock';
end;
$$;

-- Poultry owner receives feed under Inventory. Cane chairmen still cannot.
create or replace function public.record_stock_receipt(
  p_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_credit_account_id uuid,
  p_reference text,
  p_batch_no text default null,
  p_expiry_date date default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_inventory_account_id uuid;
  v_new_qty numeric(12, 2);
  v_new_avg_cost numeric(14, 2);
  v_entry_id uuid;
  v_movement public.stock_movements%rowtype;
begin
  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if not (
    public.jwt_is_inventory_manager(v_item.tenant_id)
    or public.jwt_is_poultry_manager(v_item.tenant_id)
  ) then
    raise exception 'Only the accountant, supervisor, or poultry owner can receive stock';
  end if;
  if p_quantity <= 0 then
    raise exception 'The quantity received must be positive';
  end if;
  if p_unit_cost < 0 then
    raise exception 'The unit cost can''t be negative';
  end if;
  if p_credit_account_id is null then
    raise exception 'Choose which account this stock was paid from';
  end if;

  v_new_qty := v_item.quantity_on_hand + p_quantity;
  v_new_avg_cost := round(((v_item.quantity_on_hand * v_item.average_cost) + (p_quantity * p_unit_cost)) / v_new_qty, 2);
  v_inventory_account_id := public.ensure_inventory_account(v_item.tenant_id);

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_item.tenant_id, 'STK-R-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), current_date, coalesce(p_reference, 'Stock receipt — ' || v_item.name), 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_inventory_account_id, 'Stock receipt — ' || v_item.name, round(p_quantity * p_unit_cost, 2), 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, p_credit_account_id, 'Stock receipt — ' || v_item.name, round(p_quantity * p_unit_cost, 2), 1);

  update public.inventory_items
  set quantity_on_hand = v_new_qty,
      average_cost = v_new_avg_cost,
      batch_no = coalesce(p_batch_no, batch_no),
      expiry_date = coalesce(p_expiry_date, expiry_date),
      updated_at = now()
  where id = p_item_id;

  insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, journal_entry_id, created_by)
  values (v_item.tenant_id, p_item_id, 'receipt', p_quantity, p_unit_cost, p_reference, v_entry_id, auth.uid())
  returning * into v_movement;

  return v_movement;
end;
$$;

-- ============================================================================
-- 6. Batch RPCs
-- ============================================================================

create or replace function public.place_poultry_batch(
  p_house_id uuid,
  p_placed_on date,
  p_chick_boxes integer,
  p_birds_placed integer,
  p_birds_doa integer,
  p_supplier_id uuid,
  p_chick_cost numeric,
  p_payment_account_id uuid,
  p_pen_id uuid default null,
  p_breed text default null
)
returns public.poultry_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house public.poultry_houses%rowtype;
  v_cap integer;
  v_on_farm integer;
  v_in_house integer;
  v_incoming integer;
  v_batch_no text;
  v_seq integer;
  v_entry_id uuid;
  v_chicks_account uuid;
  v_batch public.poultry_batches%rowtype;
begin
  select * into v_house from public.poultry_houses where id = p_house_id;
  if not found then
    raise exception 'House not found';
  end if;
  if not public.jwt_is_poultry_manager(v_house.tenant_id) then
    raise exception 'Only the farm owner or supervisor can place a batch';
  end if;
  if v_house.status <> 'active' then
    raise exception 'That house is not active';
  end if;
  if p_birds_placed is null or p_birds_placed <= 0 then
    raise exception 'Enter how many birds were placed';
  end if;
  if p_birds_doa is null or p_birds_doa < 0 or p_birds_doa > p_birds_placed then
    raise exception 'Dead on arrival can''t be more than the birds placed';
  end if;
  if p_chick_boxes is null or p_chick_boxes < 0 then
    raise exception 'Chick boxes can''t be negative';
  end if;
  if p_chick_cost is null or p_chick_cost < 0 then
    raise exception 'Chick cost can''t be negative';
  end if;
  if p_pen_id is not null and not exists (
    select 1 from public.poultry_pens pen
    where pen.id = p_pen_id and pen.house_id = p_house_id and pen.tenant_id = v_house.tenant_id
  ) then
    raise exception 'That pen is not in this house';
  end if;
  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers s where s.id = p_supplier_id and s.tenant_id = v_house.tenant_id
  ) then
    raise exception 'That supplier is not on this farm';
  end if;

  v_incoming := p_birds_placed - p_birds_doa;
  select coalesce(sum(public.poultry_birds_alive(b.id)), 0) into v_on_farm
  from public.poultry_batches b
  where b.tenant_id = v_house.tenant_id and b.status = 'active';

  select coalesce(poultry_bird_cap, 400) into v_cap
  from public.tenant_settings where tenant_id = v_house.tenant_id;

  if v_on_farm + v_incoming > v_cap then
    raise exception 'This placement would put % birds on the farm, above the cap of %', v_on_farm + v_incoming, v_cap;
  end if;

  select coalesce(sum(public.poultry_birds_alive(b.id)), 0) into v_in_house
  from public.poultry_batches b
  where b.house_id = p_house_id and b.status = 'active';

  if v_in_house + v_incoming > v_house.capacity_birds then
    raise exception 'This house holds % birds and already has %', v_house.capacity_birds, v_in_house;
  end if;

  select count(*) + 1 into v_seq from public.poultry_batches where tenant_id = v_house.tenant_id;
  v_batch_no := 'B-' || to_char(p_placed_on, 'YYYY') || '-' || lpad(v_seq::text, 2, '0');

  if p_chick_cost > 0 then
    if p_payment_account_id is null or not exists (
      select 1 from public.accounts a
      where a.id = p_payment_account_id and a.tenant_id = v_house.tenant_id
    ) then
      raise exception 'Choose the cash or bank account the chicks were paid from';
    end if;
    v_chicks_account := public.ensure_named_account(v_house.tenant_id, '5410', 'Day-old chicks', 'expense');
    insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
    values (v_house.tenant_id, 'CHK-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), p_placed_on, 'Day-old chicks ' || v_batch_no, 'posted', auth.uid(), auth.uid(), now())
    returning id into v_entry_id;
    insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
    values (v_entry_id, v_chicks_account, 'Day-old chicks ' || v_batch_no, p_chick_cost, 0);
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, p_payment_account_id, 'Day-old chicks ' || v_batch_no, p_chick_cost, 1);
  end if;

  insert into public.poultry_batches (
    tenant_id, batch_no, placed_on, house_id, pen_id, supplier_id,
    chick_boxes, birds_placed, birds_doa, chick_cost, breed, journal_entry_id, created_by
  ) values (
    v_house.tenant_id, v_batch_no, p_placed_on, p_house_id, p_pen_id, p_supplier_id,
    p_chick_boxes, p_birds_placed, p_birds_doa, p_chick_cost, nullif(btrim(p_breed), ''), v_entry_id, auth.uid()
  )
  returning * into v_batch;

  if p_chick_cost > 0 then
    insert into public.poultry_batch_costs (
      tenant_id, batch_id, cost_date, category, description, amount, journal_entry_id, source, source_id, created_by
    ) values (
      v_house.tenant_id, v_batch.id, p_placed_on, 'chicks', 'Day-old chicks ' || v_batch_no,
      p_chick_cost, v_entry_id, 'placement', v_batch.id, auth.uid()
    );
  end if;

  return v_batch;
end;
$$;

grant execute on function public.place_poultry_batch(uuid, date, integer, integer, integer, uuid, numeric, uuid, uuid, text) to authenticated;

create or replace function public.upsert_poultry_daily_log(
  p_batch_id uuid,
  p_log_date date,
  p_mortality integer,
  p_culls integer,
  p_feed_item_id uuid,
  p_feed_quantity numeric,
  p_temp_min_c numeric,
  p_temp_max_c numeric
)
returns public.poultry_daily_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.poultry_batches%rowtype;
  v_existing public.poultry_daily_logs%rowtype;
  v_item public.inventory_items%rowtype;
  v_alive_before integer;
  v_deaths integer;
  v_culls integer;
  v_feed numeric(12, 2);
  v_delta numeric(12, 2);
  v_movement public.stock_movements%rowtype;
  v_feed_account uuid;
  v_log public.poultry_daily_logs%rowtype;
begin
  select * into v_batch from public.poultry_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if not public.jwt_is_poultry_manager(v_batch.tenant_id) then
    raise exception 'Only the farm owner or supervisor can log a day';
  end if;
  if v_batch.status <> 'active' then
    raise exception 'This batch is closed';
  end if;
  if p_log_date < v_batch.placed_on or p_log_date > current_date then
    raise exception 'Log the day between placement and today';
  end if;
  if p_temp_min_c is not null and p_temp_max_c is not null and p_temp_max_c < p_temp_min_c then
    raise exception 'The high temperature can''t be below the low';
  end if;

  v_deaths := coalesce(p_mortality, 0);
  v_culls := coalesce(p_culls, 0);
  v_feed := coalesce(p_feed_quantity, 0);
  if v_deaths < 0 or v_culls < 0 or v_feed < 0 then
    raise exception 'Deaths, culls and feed can''t be negative';
  end if;

  select * into v_existing from public.poultry_daily_logs
  where batch_id = p_batch_id and log_date = p_log_date
  for update;

  v_alive_before := public.poultry_birds_alive(p_batch_id)
    + coalesce(v_existing.mortality, 0)
    + coalesce(v_existing.culls, 0);
  if v_deaths + v_culls > v_alive_before then
    raise exception 'That many deaths and culls would take the flock below zero (% still alive before this day)', v_alive_before;
  end if;

  if v_feed > 0 then
    select * into v_item from public.inventory_items where id = p_feed_item_id;
    if not found or v_item.tenant_id <> v_batch.tenant_id then
      raise exception 'Choose a feed item on this farm';
    end if;
    if v_item.category <> 'feed' then
      raise exception 'Daily feed has to be a feed item';
    end if;
    if v_existing.feed_item_id is not null
      and v_existing.feed_quantity > 0
      and v_existing.feed_item_id <> p_feed_item_id then
      raise exception 'Feed already issued today is for a different item. Keep that item, or fix stock under Inventory.';
    end if;
  end if;

  v_delta := v_feed - coalesce(v_existing.feed_quantity, 0);
  if v_delta < 0 then
    raise exception 'Feed already issued today can''t be reduced here. Adjust stock under Inventory if the count was wrong.';
  end if;

  if v_existing.id is null then
    insert into public.poultry_daily_logs (
      tenant_id, batch_id, log_date, mortality, culls, feed_item_id, feed_quantity, temp_min_c, temp_max_c, created_by
    ) values (
      v_batch.tenant_id, p_batch_id, p_log_date, v_deaths, v_culls,
      case when v_feed > 0 then p_feed_item_id else null end,
      v_feed, p_temp_min_c, p_temp_max_c, auth.uid()
    )
    returning * into v_log;
  else
    update public.poultry_daily_logs
    set mortality = v_deaths,
        culls = v_culls,
        feed_item_id = case when v_feed > 0 then p_feed_item_id else feed_item_id end,
        feed_quantity = v_feed,
        temp_min_c = p_temp_min_c,
        temp_max_c = p_temp_max_c,
        updated_at = now()
    where id = v_existing.id
    returning * into v_log;
  end if;

  if v_delta > 0 then
    v_feed_account := public.ensure_named_account(v_batch.tenant_id, '5420', 'Poultry feed', 'expense');
    v_movement := public.apply_stock_issue(
      p_feed_item_id,
      v_delta,
      v_feed_account,
      v_batch.batch_no || ' feed ' || p_log_date::text,
      p_log_date
    );
    insert into public.poultry_batch_costs (
      tenant_id, batch_id, cost_date, category, description, amount,
      inventory_item_id, stock_movement_id, journal_entry_id, source, source_id, created_by
    ) values (
      v_batch.tenant_id, p_batch_id, p_log_date, 'feed',
      'Feed ' || v_item.name || ' × ' || v_delta,
      round(v_delta * v_movement.unit_cost, 2),
      p_feed_item_id, v_movement.id, v_movement.journal_entry_id, 'daily_log', v_log.id, auth.uid()
    );
  end if;

  return v_log;
end;
$$;

grant execute on function public.upsert_poultry_daily_log(uuid, date, integer, integer, uuid, numeric, numeric, numeric) to authenticated;

create or replace function public.record_poultry_sale(
  p_batch_id uuid,
  p_sale_date date,
  p_birds integer,
  p_unit_price numeric,
  p_payment_account_id uuid,
  p_buyer_name text default null
)
returns public.poultry_sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.poultry_batches%rowtype;
  v_price numeric(14, 2);
  v_total numeric(14, 2);
  v_income uuid;
  v_entry_id uuid;
  v_sale public.poultry_sales%rowtype;
begin
  select * into v_batch from public.poultry_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if not public.jwt_is_poultry_manager(v_batch.tenant_id) then
    raise exception 'Only the farm owner or supervisor can record a sale';
  end if;
  if v_batch.status <> 'active' then
    raise exception 'This batch is closed';
  end if;
  if p_birds is null or p_birds <= 0 then
    raise exception 'Enter how many birds were sold';
  end if;
  if p_birds > public.poultry_birds_alive(p_batch_id) then
    raise exception 'Only % birds are still alive', public.poultry_birds_alive(p_batch_id);
  end if;
  if p_sale_date < v_batch.placed_on or p_sale_date > current_date then
    raise exception 'The sale date has to fall in this batch';
  end if;
  if p_payment_account_id is null or not exists (
    select 1 from public.accounts a where a.id = p_payment_account_id and a.tenant_id = v_batch.tenant_id
  ) then
    raise exception 'Choose the cash or bank account the money went into';
  end if;

  v_price := coalesce(p_unit_price, 100);
  if v_price < 0 then
    raise exception 'Price can''t be negative';
  end if;
  v_total := round(p_birds * v_price, 2);
  v_income := public.ensure_named_account(v_batch.tenant_id, '4100', 'Live bird sales', 'income');

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_batch.tenant_id, 'SALE-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), p_sale_date, 'Live birds ' || v_batch.batch_no, 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, p_payment_account_id, 'Live birds ' || v_batch.batch_no, v_total, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_income, 'Live birds ' || v_batch.batch_no, v_total, 1);

  insert into public.poultry_sales (
    tenant_id, batch_id, sale_date, birds, unit_price, total_amount, buyer_name, payment_account_id, journal_entry_id, created_by
  ) values (
    v_batch.tenant_id, p_batch_id, p_sale_date, p_birds, v_price, v_total,
    nullif(btrim(p_buyer_name), ''), p_payment_account_id, v_entry_id, auth.uid()
  )
  returning * into v_sale;

  return v_sale;
end;
$$;

grant execute on function public.record_poultry_sale(uuid, date, integer, numeric, uuid, text) to authenticated;

create or replace function public.close_poultry_batch(
  p_batch_id uuid,
  p_birds_written_off integer,
  p_closed_on date default current_date
)
returns public.poultry_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.poultry_batches%rowtype;
  v_alive integer;
begin
  select * into v_batch from public.poultry_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if not public.jwt_is_poultry_manager(v_batch.tenant_id) then
    raise exception 'Only the farm owner or supervisor can close a batch';
  end if;
  if v_batch.status <> 'active' then
    raise exception 'This batch is already closed';
  end if;
  v_alive := public.poultry_birds_alive(p_batch_id);
  if p_birds_written_off is null or p_birds_written_off <> v_alive then
    raise exception 'Write off the % birds still alive, or sell them first', v_alive;
  end if;
  if p_closed_on < v_batch.placed_on then
    raise exception 'The close date can''t be before placement';
  end if;

  update public.poultry_batches
  set status = 'closed',
      closed_on = p_closed_on,
      birds_written_off = p_birds_written_off,
      updated_at = now()
  where id = p_batch_id
  returning * into v_batch;

  return v_batch;
end;
$$;

grant execute on function public.close_poultry_batch(uuid, integer, date) to authenticated;

-- ============================================================================
-- 7. Summary view
-- ============================================================================

create view public.poultry_batch_summary
with (security_invoker = true) as
select
  b.id,
  b.tenant_id,
  b.batch_no,
  b.status,
  b.placed_on,
  b.closed_on,
  b.house_id,
  h.code as house_code,
  h.name as house_name,
  b.pen_id,
  p.code as pen_code,
  b.supplier_id,
  s.name as supplier_name,
  b.chick_boxes,
  b.birds_placed,
  b.birds_doa,
  b.birds_written_off,
  b.chick_cost,
  b.breed,
  (coalesce(b.closed_on, current_date) - b.placed_on) as age_days,
  case
    when b.status = 'closed' then 'closed'
    when (current_date - b.placed_on) < 14 then 'brooding'
    when (current_date - b.placed_on) < 42 then 'growing'
    else 'selling'
  end as phase,
  (
    b.birds_doa + coalesce((select sum(l.mortality + l.culls) from public.poultry_daily_logs l where l.batch_id = b.id), 0)
  )::integer as birds_dead,
  coalesce((select sum(sl.birds) from public.poultry_sales sl where sl.batch_id = b.id), 0)::integer as birds_sold,
  public.poultry_birds_alive(b.id) as birds_alive,
  round(
    (
      b.birds_doa + coalesce((select sum(l.mortality + l.culls) from public.poultry_daily_logs l where l.batch_id = b.id), 0)
    )::numeric / nullif(b.birds_placed, 0) * 100,
    1
  ) as mortality_pct,
  round(coalesce((
    select sum(l.feed_quantity * i.unit_weight_kg)
    from public.poultry_daily_logs l
    join public.inventory_items i on i.id = l.feed_item_id
    where l.batch_id = b.id and i.unit_weight_kg is not null
  ), 0), 1) as feed_kg,
  coalesce((select sum(c.amount) from public.poultry_batch_costs c where c.batch_id = b.id), 0) as cost,
  coalesce((select sum(sl.total_amount) from public.poultry_sales sl where sl.batch_id = b.id), 0) as revenue,
  coalesce((select sum(sl.total_amount) from public.poultry_sales sl where sl.batch_id = b.id), 0)
    - coalesce((select sum(c.amount) from public.poultry_batch_costs c where c.batch_id = b.id), 0) as surplus
from public.poultry_batches b
join public.poultry_houses h on h.id = b.house_id
left join public.poultry_pens p on p.id = b.pen_id
left join public.suppliers s on s.id = b.supplier_id;

grant select on public.poultry_houses, public.poultry_pens, public.poultry_batches,
  public.poultry_daily_logs, public.poultry_sales, public.poultry_batch_costs,
  public.poultry_batch_summary
  to authenticated;
grant insert, update, delete on public.poultry_houses, public.poultry_pens to authenticated;

-- Seed the cash, bank, chick, feed and sales accounts when a poultry farm
-- is registered. The JWT does not yet include the new tenant, so this
-- calls ensure_named_account directly instead of seed_poultry_accounts.
create or replace function public.register_association(
  p_name text,
  p_slug text,
  p_mill public.mill_name,
  p_enterprise_kind public.enterprise_kind default 'sugarcane_association'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_mill public.mill_name := p_mill;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create an association';
  end if;

  if p_enterprise_kind = 'poultry_farm' then
    v_mill := 'other';
  end if;

  insert into public.tenants (name, slug, mill, enterprise_kind)
  values (p_name, p_slug, v_mill, p_enterprise_kind)
  returning id into v_tenant_id;

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id);

  insert into public.memberships (tenant_id, user_id, role, status)
  values (v_tenant_id, auth.uid(), 'chairman', 'active');

  if p_enterprise_kind in ('poultry_farm', 'mixed') then
    perform public.ensure_named_account(v_tenant_id, '1000', 'Bank', 'asset');
    perform public.ensure_named_account(v_tenant_id, '1010', 'Cash on hand', 'asset');
    perform public.ensure_named_account(v_tenant_id, '1300', 'Inventory', 'asset');
    perform public.ensure_named_account(v_tenant_id, '4100', 'Live bird sales', 'income');
    perform public.ensure_named_account(v_tenant_id, '5410', 'Day-old chicks', 'expense');
    perform public.ensure_named_account(v_tenant_id, '5420', 'Poultry feed', 'expense');
  end if;

  return v_tenant_id;
end;
$$;
