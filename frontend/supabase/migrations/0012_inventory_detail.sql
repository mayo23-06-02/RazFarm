-- Module F.1 follow-up: richer item detail (location, batch/expiry, min/max/
-- preferred reorder qty, asset detail for equipment/vehicle/plant_equipment),
-- an equipment service/maintenance log, and a no-pricing stock-levels view
-- for the plain 'member' role (design ask: pricing exists in the system but
-- is hidden from members — they only ever see qty + reorder status).
--
-- No changes to jwt_is_inventory_viewer/manager (0009 §3): the existing
-- chairman/treasurer/accountant/supervisor cost visibility is unchanged.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.inventory_item_condition as enum ('excellent', 'good', 'fair', 'poor', 'out_of_service');

-- ============================================================================
-- 2. inventory_items — extra detail columns
-- ============================================================================

alter table public.inventory_items
  add column storage_location text,
  add column batch_no text,
  add column expiry_date date,
  add column max_stock_level numeric(12, 2) check (max_stock_level is null or max_stock_level >= 0),
  add column preferred_order_qty numeric(12, 2) check (preferred_order_qty is null or preferred_order_qty >= 0),
  add column serial_or_asset_no text,
  add column purchase_date date,
  add column condition public.inventory_item_condition;

-- ============================================================================
-- 3. Equipment / vehicle / plant service log — a straightforward log, not
--    tied to a GL posting (unlike stock_movements), so unlike that table it's
--    fine to grant direct insert/update/delete to inventory managers.
-- ============================================================================

create table public.equipment_service_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  service_date date not null default current_date,
  description text not null check (char_length(description) between 2 and 500),
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  performed_by text,
  odometer_or_hours numeric(12, 2),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index equipment_service_log_item_id_idx on public.equipment_service_log (item_id, service_date desc);
create index equipment_service_log_tenant_id_idx on public.equipment_service_log (tenant_id);

alter table public.equipment_service_log enable row level security;

create policy equipment_service_log_select on public.equipment_service_log
  for select using (public.jwt_is_inventory_viewer(tenant_id));

create policy equipment_service_log_write on public.equipment_service_log
  for all using (public.jwt_is_inventory_manager(tenant_id))
  with check (public.jwt_is_inventory_manager(tenant_id));

-- ============================================================================
-- 4. record_stock_receipt — add optional batch_no/expiry_date, stamped onto
--    the item as its current batch. Note this is an aggregate/latest-batch
--    model, same simplification as average_cost: it does not do per-batch
--    FIFO tracking of which physical units belong to which batch.
-- ============================================================================

drop function if exists public.record_stock_receipt(uuid, numeric, numeric, uuid, text);

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

grant execute on function public.record_stock_receipt(uuid, numeric, numeric, uuid, text, text, date) to authenticated;

-- ============================================================================
-- 5. receive_purchase_order_lines — accept optional per-line batch_no/
--    expiry_date in the p_lines jsonb (same simplification as above).
-- ============================================================================

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
  v_batch_no text;
  v_expiry_date date;
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
    v_batch_no := v_line->>'batch_no';
    v_expiry_date := nullif(v_line->>'expiry_date', '')::date;

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
    set quantity_on_hand = v_new_qty,
        average_cost = v_new_avg_cost,
        batch_no = coalesce(v_batch_no, batch_no),
        expiry_date = coalesce(v_expiry_date, expiry_date),
        updated_at = now()
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

-- ============================================================================
-- 6. list_inventory_stock_levels — pricing hidden. Returns quantity/reorder
--    status only (no average_cost, no value) to ANY active tenant member
--    (jwt_is_member, not jwt_is_inventory_viewer), so plain 'member' users can
--    check stock availability without seeing what anything is worth. The
--    full inventory_items table (with cost) stays restricted to the existing
--    chairman/treasurer/accountant/supervisor viewer roles — unchanged.
-- ============================================================================

create or replace function public.list_inventory_stock_levels(p_tenant_id uuid)
returns table (
  id uuid,
  sku text,
  name text,
  category public.inventory_item_category,
  unit text,
  quantity_on_hand numeric,
  is_low_stock boolean,
  storage_location text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.sku, i.name, i.category, i.unit, i.quantity_on_hand,
         (i.quantity_on_hand <= i.reorder_level) as is_low_stock,
         i.storage_location, i.is_active
  from public.inventory_items i
  where i.tenant_id = p_tenant_id
    and public.jwt_is_member(p_tenant_id)
  order by i.name;
$$;

grant execute on function public.list_inventory_stock_levels(uuid) to authenticated;
