-- Module F.1: Inventory Core (design.md §12.3, Module F)
-- First slice of Inventory, Equipment & Irrigation — input inventory items,
-- suppliers, and a perpetual stock ledger (receipts/issues/adjustments) that
-- posts into the general ledger built in 0004. Deliberately out of scope for
-- this migration (built later on top of this ledger, same as AR/Payouts sat
-- on top of 0004): purchase orders & goods-received notes, sales-linked
-- stock/cost-of-sales, issue-to-field cost accounting, the equipment
-- register, and irrigation management.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.inventory_item_category as enum ('fertilizer', 'chemical', 'seed_cane', 'other');
create type public.stock_movement_type as enum ('receipt', 'issue', 'adjustment');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  contact_name text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 40),
  name text not null check (char_length(name) between 2 and 160),
  category public.inventory_item_category not null default 'other',
  unit text not null default 'each',
  reorder_level numeric(12, 2) not null default 0 check (reorder_level >= 0),
  quantity_on_hand numeric(12, 2) not null default 0,
  average_cost numeric(14, 2) not null default 0 check (average_cost >= 0),
  default_supplier_id uuid references public.suppliers (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null references public.inventory_items (id),
  movement_type public.stock_movement_type not null,
  quantity_delta numeric(12, 2) not null check (quantity_delta <> 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  reference text,
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index suppliers_tenant_id_idx on public.suppliers (tenant_id);
create index inventory_items_tenant_id_idx on public.inventory_items (tenant_id, category);
create index stock_movements_item_id_idx on public.stock_movements (item_id, created_at desc);

-- ============================================================================
-- 3. Role helpers — reuses jwt_has_role from 0001. Supervisor is the
-- field-operations role (design.md §12.2: "records ... inventory issues"),
-- so it manages day-to-day stock alongside the accountant.
-- ============================================================================

create or replace function public.jwt_is_inventory_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'accountant', 'supervisor']::public.member_role[]);
$$;

create or replace function public.jwt_is_inventory_manager(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['supervisor', 'accountant']::public.member_role[]);
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;

create policy suppliers_select on public.suppliers
  for select using (public.jwt_is_inventory_viewer(tenant_id));

create policy suppliers_write on public.suppliers
  for all using (public.jwt_is_inventory_manager(tenant_id))
  with check (public.jwt_is_inventory_manager(tenant_id));

create policy inventory_items_select on public.inventory_items
  for select using (public.jwt_is_inventory_viewer(tenant_id));

create policy inventory_items_write on public.inventory_items
  for all using (public.jwt_is_inventory_manager(tenant_id))
  with check (public.jwt_is_inventory_manager(tenant_id));

create policy stock_movements_select on public.stock_movements
  for select using (public.jwt_is_inventory_viewer(tenant_id));

-- Movements are only ever created via the RPCs below (which post the
-- matching journal entry and update the item's running balance in the same
-- transaction) — no direct insert/update/delete policy is granted for app
-- roles, same reasoning as invoice_payments/credit_notes in 0005.

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create trigger set_inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. RPCs — ensure_inventory_account (internal helper), record_stock_receipt,
--    record_stock_issue, record_stock_adjustment
--
-- All security definer so they can post journal entries (which ordinarily
-- only chairman/treasurer can post) on the inventory manager's behalf —
-- these are system-generated postings tied 1:1 to a stock movement, not
-- freeform journal entries, same reasoning as record_invoice_payment (0005)
-- and record_petty_cash_expense (0008).
-- ============================================================================

create or replace function public.ensure_inventory_account(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select id into v_account_id from public.accounts where tenant_id = p_tenant_id and code = '1300';
  if not found then
    insert into public.accounts (tenant_id, code, name, type)
    values (p_tenant_id, '1300', 'Inventory', 'asset')
    returning id into v_account_id;
  end if;
  return v_account_id;
end;
$$;

create or replace function public.ensure_inventory_adjustment_account(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select id into v_account_id from public.accounts where tenant_id = p_tenant_id and code = '5900';
  if not found then
    insert into public.accounts (tenant_id, code, name, type)
    values (p_tenant_id, '5900', 'Inventory adjustments', 'expense')
    returning id into v_account_id;
  end if;
  return v_account_id;
end;
$$;

create or replace function public.record_stock_receipt(
  p_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_credit_account_id uuid,
  p_reference text
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
  select * into v_item from public.inventory_items where id = p_item_id;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if not public.jwt_is_inventory_manager(v_item.tenant_id) then
    raise exception 'Only the accountant or supervisor can receive stock';
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
  values (v_entry_id, v_inventory_account_id, 'Stock receipt — ' || v_item.name, p_quantity * p_unit_cost, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, p_credit_account_id, 'Stock receipt — ' || v_item.name, p_quantity * p_unit_cost, 1);

  update public.inventory_items
  set quantity_on_hand = v_new_qty, average_cost = v_new_avg_cost, updated_at = now()
  where id = p_item_id;

  insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, journal_entry_id, created_by)
  values (v_item.tenant_id, p_item_id, 'receipt', p_quantity, p_unit_cost, p_reference, v_entry_id, auth.uid())
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function public.record_stock_receipt(uuid, numeric, numeric, uuid, text) to authenticated;

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
  v_inventory_account_id uuid;
  v_cost numeric(14, 2);
  v_entry_id uuid;
  v_movement public.stock_movements%rowtype;
begin
  select * into v_item from public.inventory_items where id = p_item_id;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if not public.jwt_is_inventory_manager(v_item.tenant_id) then
    raise exception 'Only the accountant or supervisor can issue stock';
  end if;
  if p_quantity <= 0 then
    raise exception 'The quantity issued must be positive';
  end if;
  if p_expense_account_id is null then
    raise exception 'Choose what this stock was used for';
  end if;
  if p_quantity > v_item.quantity_on_hand then
    raise exception 'Can''t issue % — only % % in stock', p_quantity, v_item.quantity_on_hand, v_item.unit;
  end if;

  v_cost := round(p_quantity * v_item.average_cost, 2);
  v_inventory_account_id := public.ensure_inventory_account(v_item.tenant_id);

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_item.tenant_id, 'STK-I-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), current_date, coalesce(p_reference, 'Stock issued — ' || v_item.name), 'posted', auth.uid(), auth.uid(), now())
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

grant execute on function public.record_stock_issue(uuid, numeric, uuid, text) to authenticated;

create or replace function public.record_stock_adjustment(
  p_item_id uuid,
  p_quantity_delta numeric,
  p_reason text
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_inventory_account_id uuid;
  v_adjustment_account_id uuid;
  v_new_qty numeric(12, 2);
  v_cost numeric(14, 2);
  v_entry_id uuid;
  v_movement public.stock_movements%rowtype;
begin
  select * into v_item from public.inventory_items where id = p_item_id;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if not public.jwt_is_inventory_manager(v_item.tenant_id) then
    raise exception 'Only the accountant or supervisor can adjust stock';
  end if;
  if p_quantity_delta = 0 then
    raise exception 'The adjustment quantity can''t be zero';
  end if;

  v_new_qty := v_item.quantity_on_hand + p_quantity_delta;
  if v_new_qty < 0 then
    raise exception 'This adjustment would take stock below zero';
  end if;

  v_cost := round(abs(p_quantity_delta) * v_item.average_cost, 2);
  v_inventory_account_id := public.ensure_inventory_account(v_item.tenant_id);
  v_adjustment_account_id := public.ensure_inventory_adjustment_account(v_item.tenant_id);

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_item.tenant_id, 'STK-A-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), current_date, coalesce(p_reason, 'Stock adjustment — ' || v_item.name), 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  if p_quantity_delta < 0 then
    -- Shrinkage/loss: inventory value goes down, expensed.
    insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
    values (v_entry_id, v_adjustment_account_id, coalesce(p_reason, 'Stock adjustment — ' || v_item.name), v_cost, 0);
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, v_inventory_account_id, coalesce(p_reason, 'Stock adjustment — ' || v_item.name), v_cost, 1);
  else
    -- Found stock: inventory value goes up, offset against the same swing account.
    insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
    values (v_entry_id, v_inventory_account_id, coalesce(p_reason, 'Stock adjustment — ' || v_item.name), v_cost, 0);
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, v_adjustment_account_id, coalesce(p_reason, 'Stock adjustment — ' || v_item.name), v_cost, 1);
  end if;

  update public.inventory_items
  set quantity_on_hand = v_new_qty, updated_at = now()
  where id = p_item_id;

  insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, journal_entry_id, created_by)
  values (v_item.tenant_id, p_item_id, 'adjustment', p_quantity_delta, v_item.average_cost, p_reason, v_entry_id, auth.uid())
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function public.record_stock_adjustment(uuid, numeric, text) to authenticated;
