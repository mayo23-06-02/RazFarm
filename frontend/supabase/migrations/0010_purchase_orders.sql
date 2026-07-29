-- Module F.2: Purchase Orders & Goods-Received Notes (design.md §12.3, Module F)
-- Sits on top of 0009's inventory core, same way Accounts Receivable (0005)
-- sat on top of the general ledger (0004). Issuing a PO is not a financial
-- event (no GL impact) — only recording goods received is: it increases
-- stock (reusing 0009's weighted-average costing) and, in the same step,
-- creates the supplier bill (a minimal Accounts Payable — no fuller AP
-- module exists yet, same reasoning 0005 gave for Accounts Receivable).
-- Deliberately out of scope: partial bill payments (mark_supplier_bill_paid
-- closes a bill in one payment), sales-linked stock/COGS, issue-to-field,
-- equipment, irrigation — those are later Module F phases.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.purchase_order_status as enum ('draft', 'issued', 'received', 'billed', 'cancelled');
create type public.supplier_bill_status as enum ('open', 'paid');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id),
  po_no text not null,
  status public.purchase_order_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, po_no)
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  position integer not null default 0,
  item_id uuid not null references public.inventory_items (id),
  quantity_ordered numeric(12, 2) not null check (quantity_ordered > 0),
  quantity_received numeric(12, 2) not null default 0 check (quantity_received >= 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0)
);

create table public.goods_received_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id),
  grn_no text not null,
  received_date date not null default current_date,
  reference text,
  supplier_bill_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (tenant_id, grn_no)
);

create table public.goods_received_lines (
  id uuid primary key default gen_random_uuid(),
  goods_received_note_id uuid not null references public.goods_received_notes (id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines (id),
  item_id uuid not null references public.inventory_items (id),
  quantity_received numeric(12, 2) not null check (quantity_received > 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  stock_movement_id uuid references public.stock_movements (id)
);

create table public.supplier_bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id),
  goods_received_note_id uuid references public.goods_received_notes (id),
  bill_no text not null,
  bill_date date not null default current_date,
  amount numeric(14, 2) not null check (amount > 0),
  status public.supplier_bill_status not null default 'open',
  journal_entry_id uuid references public.journal_entries (id),
  paid_journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, bill_no)
);

alter table public.goods_received_notes
  add constraint goods_received_notes_supplier_bill_id_fkey foreign key (supplier_bill_id) references public.supplier_bills (id);

create index purchase_orders_tenant_id_idx on public.purchase_orders (tenant_id, order_date desc);
create index purchase_order_lines_po_id_idx on public.purchase_order_lines (purchase_order_id);
create index goods_received_notes_po_id_idx on public.goods_received_notes (purchase_order_id);
create index goods_received_lines_grn_id_idx on public.goods_received_lines (goods_received_note_id);
create index supplier_bills_tenant_id_idx on public.supplier_bills (tenant_id, bill_date desc);
create index supplier_bills_supplier_id_idx on public.supplier_bills (supplier_id);

-- ============================================================================
-- 3. Row Level Security (reuses jwt_is_inventory_viewer / jwt_is_inventory_manager
--    from 0009 §3)
-- ============================================================================

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.goods_received_notes enable row level security;
alter table public.goods_received_lines enable row level security;
alter table public.supplier_bills enable row level security;

create policy purchase_orders_select on public.purchase_orders
  for select using (public.jwt_is_inventory_viewer(tenant_id));

-- Header fields are only directly editable while still a draft; issuing
-- (draft -> issued) happens through issue_purchase_order() below, and
-- receiving (issued -> received/billed) through receive_purchase_order_lines(),
-- not a raw update — same pattern as invoices_update in 0005.
create policy purchase_orders_insert on public.purchase_orders
  for insert with check (public.jwt_is_inventory_manager(tenant_id) and status = 'draft');

create policy purchase_orders_update on public.purchase_orders
  for update using (public.jwt_is_inventory_manager(tenant_id) and status = 'draft')
  with check (public.jwt_is_inventory_manager(tenant_id) and status = 'draft');

create policy purchase_orders_delete on public.purchase_orders
  for delete using (public.jwt_is_inventory_manager(tenant_id) and status = 'draft');

create policy purchase_order_lines_select on public.purchase_order_lines
  for select using (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_lines.purchase_order_id and public.jwt_is_inventory_viewer(po.tenant_id))
  );

create policy purchase_order_lines_write on public.purchase_order_lines
  for all using (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_lines.purchase_order_id and po.status = 'draft' and public.jwt_is_inventory_manager(po.tenant_id))
  )
  with check (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_lines.purchase_order_id and po.status = 'draft' and public.jwt_is_inventory_manager(po.tenant_id))
  );

create policy goods_received_notes_select on public.goods_received_notes
  for select using (public.jwt_is_inventory_viewer(tenant_id));

create policy goods_received_lines_select on public.goods_received_lines
  for select using (
    exists (select 1 from public.goods_received_notes g where g.id = goods_received_lines.goods_received_note_id and public.jwt_is_inventory_viewer(g.tenant_id))
  );

create policy supplier_bills_select on public.supplier_bills
  for select using (public.jwt_is_inventory_viewer(tenant_id));

-- GRNs, their lines, and supplier bills are only ever created via
-- receive_purchase_order_lines() below (which posts the matching journal
-- entry in the same transaction) — no direct insert/update/delete policy is
-- granted for app roles, same reasoning as invoice_payments in 0005.

create trigger set_purchase_orders_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

create trigger set_supplier_bills_updated_at
  before update on public.supplier_bills
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. RPCs — ensure_accounts_payable_account (internal helper),
--    issue_purchase_order, receive_purchase_order_lines, mark_supplier_bill_paid
-- ============================================================================

create or replace function public.ensure_accounts_payable_account(p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select id into v_account_id from public.accounts where tenant_id = p_tenant_id and code = '2000';
  if not found then
    insert into public.accounts (tenant_id, code, name, type)
    values (p_tenant_id, '2000', 'Accounts payable', 'liability')
    returning id into v_account_id;
  end if;
  return v_account_id;
end;
$$;

create or replace function public.issue_purchase_order(p_po_id uuid)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_line_count int;
begin
  select * into v_po from public.purchase_orders where id = p_po_id;
  if not found then
    raise exception 'Purchase order not found';
  end if;
  if not public.jwt_is_inventory_manager(v_po.tenant_id) then
    raise exception 'Only the accountant or supervisor can issue purchase orders';
  end if;
  if v_po.status <> 'draft' then
    raise exception 'This purchase order has already been issued';
  end if;

  select count(*) into v_line_count from public.purchase_order_lines where purchase_order_id = p_po_id;
  if v_line_count = 0 then
    raise exception 'Add at least one line before issuing';
  end if;

  update public.purchase_orders
  set status = 'issued', updated_at = now()
  where id = p_po_id
  returning * into v_po;

  return v_po;
end;
$$;

grant execute on function public.issue_purchase_order(uuid) to authenticated;

-- p_lines: jsonb array of {po_line_id, quantity_received, unit_cost}
create or replace function public.receive_purchase_order_lines(
  p_po_id uuid,
  p_received_date date,
  p_lines jsonb,
  p_reference text
)
returns public.goods_received_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po public.purchase_orders%rowtype;
  v_line jsonb;
  v_po_line public.purchase_order_lines%rowtype;
  v_qty numeric(12, 2);
  v_unit_cost numeric(14, 2);
  v_total numeric(14, 2) := 0;
  v_movement_id uuid;
  v_new_qty numeric(12, 2);
  v_new_avg_cost numeric(14, 2);
  v_inventory_account_id uuid;
  v_ap_account_id uuid;
  v_entry_id uuid;
  v_grn_id uuid;
  v_grn_no text;
  v_bill_id uuid;
  v_bill_no text;
  v_all_received boolean;
  v_grn public.goods_received_notes%rowtype;
begin
  select * into v_po from public.purchase_orders where id = p_po_id;
  if not found then
    raise exception 'Purchase order not found';
  end if;
  if not public.jwt_is_inventory_manager(v_po.tenant_id) then
    raise exception 'Only the accountant or supervisor can record goods received';
  end if;
  if v_po.status not in ('issued', 'received') then
    raise exception 'This purchase order isn''t awaiting delivery';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Record at least one line as received';
  end if;

  v_inventory_account_id := public.ensure_inventory_account(v_po.tenant_id);
  v_ap_account_id := public.ensure_accounts_payable_account(v_po.tenant_id);

  v_grn_no := 'GRN-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  insert into public.goods_received_notes (tenant_id, purchase_order_id, grn_no, received_date, reference, created_by)
  values (v_po.tenant_id, p_po_id, v_grn_no, p_received_date, p_reference, auth.uid())
  returning id into v_grn_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select * into v_po_line from public.purchase_order_lines where id = (v_line->>'po_line_id')::uuid and purchase_order_id = p_po_id;
    if not found then
      raise exception 'Purchase order line not found on this order';
    end if;

    v_qty := (v_line->>'quantity_received')::numeric(12, 2);
    v_unit_cost := coalesce((v_line->>'unit_cost')::numeric(14, 2), v_po_line.unit_cost);

    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantity received must be positive';
    end if;
    if v_po_line.quantity_received + v_qty > v_po_line.quantity_ordered then
      raise exception 'Can''t receive more than the % ordered', v_po_line.quantity_ordered;
    end if;

    -- Weighted-average cost update, same formula as record_stock_receipt (0009).
    select quantity_on_hand, average_cost into v_new_qty, v_new_avg_cost from public.inventory_items where id = v_po_line.item_id;
    v_new_avg_cost := round(((v_new_qty * v_new_avg_cost) + (v_qty * v_unit_cost)) / (v_new_qty + v_qty), 2);
    v_new_qty := v_new_qty + v_qty;

    update public.inventory_items
    set quantity_on_hand = v_new_qty, average_cost = v_new_avg_cost, updated_at = now()
    where id = v_po_line.item_id;

    insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, created_by)
    values (v_po.tenant_id, v_po_line.item_id, 'receipt', v_qty, v_unit_cost, v_grn_no, auth.uid())
    returning id into v_movement_id;

    insert into public.goods_received_lines (goods_received_note_id, purchase_order_line_id, item_id, quantity_received, unit_cost, stock_movement_id)
    values (v_grn_id, v_po_line.id, v_po_line.item_id, v_qty, v_unit_cost, v_movement_id);

    update public.purchase_order_lines
    set quantity_received = quantity_received + v_qty, unit_cost = v_unit_cost
    where id = v_po_line.id;

    v_total := v_total + (v_qty * v_unit_cost);
  end loop;

  -- One consolidated GL posting and one supplier bill for the whole GRN.
  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_po.tenant_id, v_grn_no, p_received_date, 'Goods received — ' || v_po.po_no, 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_inventory_account_id, 'Goods received — ' || v_po.po_no, v_total, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_ap_account_id, 'Goods received — ' || v_po.po_no, v_total, 1);

  v_bill_no := 'BILL-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  insert into public.supplier_bills (tenant_id, supplier_id, goods_received_note_id, bill_no, bill_date, amount, status, journal_entry_id, created_by)
  values (v_po.tenant_id, v_po.supplier_id, v_grn_id, v_bill_no, p_received_date, v_total, 'open', v_entry_id, auth.uid())
  returning id into v_bill_id;

  update public.goods_received_notes set supplier_bill_id = v_bill_id where id = v_grn_id;

  select not exists (
    select 1 from public.purchase_order_lines where purchase_order_id = p_po_id and quantity_received < quantity_ordered
  ) into v_all_received;

  update public.purchase_orders
  set status = (case when v_all_received then 'billed' else 'received' end)::purchase_order_status, updated_at = now()
  where id = p_po_id;

  select * into v_grn from public.goods_received_notes where id = v_grn_id;
  return v_grn;
end;
$$;

grant execute on function public.receive_purchase_order_lines(uuid, date, jsonb, text) to authenticated;

create or replace function public.mark_supplier_bill_paid(
  p_bill_id uuid,
  p_payment_date date,
  p_payment_account_id uuid
)
returns public.supplier_bills
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bill public.supplier_bills%rowtype;
  v_ap_account_id uuid;
  v_entry_id uuid;
begin
  select * into v_bill from public.supplier_bills where id = p_bill_id;
  if not found then
    raise exception 'Supplier bill not found';
  end if;
  if not public.jwt_is_inventory_manager(v_bill.tenant_id) then
    raise exception 'Only the accountant or supervisor can settle supplier bills';
  end if;
  if v_bill.status = 'paid' then
    raise exception 'This bill has already been paid';
  end if;
  if p_payment_account_id is null then
    raise exception 'Choose which account this was paid from';
  end if;

  v_ap_account_id := public.ensure_accounts_payable_account(v_bill.tenant_id);

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_bill.tenant_id, 'PAY-' || v_bill.bill_no, p_payment_date, 'Payment for ' || v_bill.bill_no, 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_ap_account_id, 'Payment for ' || v_bill.bill_no, v_bill.amount, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, p_payment_account_id, 'Payment for ' || v_bill.bill_no, v_bill.amount, 1);

  update public.supplier_bills
  set status = 'paid', paid_journal_entry_id = v_entry_id, updated_at = now()
  where id = p_bill_id
  returning * into v_bill;

  return v_bill;
end;
$$;

grant execute on function public.mark_supplier_bill_paid(uuid, date, uuid) to authenticated;
