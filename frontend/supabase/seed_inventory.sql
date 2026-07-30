-- Test data for Module F (Inventory, Purchase Orders & Goods-Received Notes).
-- Run this in the Supabase SQL editor against your project (as postgres —
-- it inserts directly into stock_movements/goods_received_notes/supplier_bills,
-- which have no insert policy for app roles by design; see 0009 §4 and 0010 §3).
-- Intentionally skips journal_entries/journal_lines postings — this seed only
-- populates the inventory UI for click-through testing, it does not need to
-- balance the general ledger. Real app usage always goes through the RPCs
-- (record_stock_receipt, receive_purchase_order_lines, etc.), which do.
--
-- Safe to run once against a tenant with no existing inventory data. Re-running
-- will fail on the unique constraints (sku / po_no / grn_no / bill_no) rather
-- than silently duplicating rows.
--
-- If you have more than one tenant, replace the "order by created_at limit 1"
-- below with an explicit "where name = '...'" to target the right one.
--
-- Requires migrations through 0011_inventory_equipment_categories.sql to
-- have been applied (adds the equipment/vehicle/plant_equipment categories
-- used below).

do $$
declare
  v_tenant_id uuid;
  v_supplier_greengrow uuid;
  v_supplier_agrochem uuid;
  v_supplier_canecoop uuid;
  v_item_fert001 uuid;
  v_item_fert002 uuid;
  v_item_chem001 uuid;
  v_item_chem002 uuid;
  v_item_seed001 uuid;
  v_item_equip001 uuid;
  v_item_veh001 uuid;
  v_item_plant001 uuid;
  v_item_oth001 uuid;
  v_po_issued uuid;
  v_po_draft uuid;
  v_po_billed uuid;
  v_po_billed_line uuid;
  v_grn_id uuid;
  v_grn_no text := 'GRN-SEED-0001';
  v_grn_line_movement uuid;
  v_bill_id uuid;
  v_qty_before numeric(12, 2);
  v_cost_before numeric(14, 2);
  v_new_qty numeric(12, 2);
  v_new_avg_cost numeric(14, 2);
begin
  select id into v_tenant_id from public.tenants order by created_at asc limit 1;
  if v_tenant_id is null then
    raise exception 'No tenant found — create/onboard a tenant in the app first';
  end if;

  -- 1. Suppliers ----------------------------------------------------------
  insert into public.suppliers (tenant_id, name, contact_name, phone, email)
  values (v_tenant_id, 'GreenGrow Fertilizers', 'Thabo Nkosi', '+27 82 555 0101', 'sales@greengrow.example')
  returning id into v_supplier_greengrow;

  insert into public.suppliers (tenant_id, name, contact_name, phone, email)
  values (v_tenant_id, 'AgroChem Solutions', 'Lindiwe Dube', '+27 83 555 0142', 'orders@agrochem.example')
  returning id into v_supplier_agrochem;

  insert into public.suppliers (tenant_id, name, contact_name, phone, email)
  values (v_tenant_id, 'Cane Seed Co-op', 'Sipho Zulu', '+27 84 555 0198', 'info@caneseedcoop.example')
  returning id into v_supplier_canecoop;

  -- 2. Inventory items (opening balances) ----------------------------------
  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost, default_supplier_id)
  values (v_tenant_id, 'FERT-001', 'NPK 12:24:12', 'fertilizer', 'bag (50kg)', 20, 45, 350.00, v_supplier_greengrow)
  returning id into v_item_fert001;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost, default_supplier_id)
  values (v_tenant_id, 'FERT-002', 'Urea 46%', 'fertilizer', 'bag (50kg)', 15, 8, 420.00, v_supplier_greengrow) -- below reorder level: low-stock test case
  returning id into v_item_fert002;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost, default_supplier_id)
  values (v_tenant_id, 'CHEM-001', 'Glyphosate 480SL', 'chemical', 'litre', 30, 60, 85.50, v_supplier_agrochem)
  returning id into v_item_chem001;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost, default_supplier_id)
  values (v_tenant_id, 'CHEM-002', 'Mancozeb 80WP', 'chemical', 'kg', 10, 4, 120.00, v_supplier_agrochem) -- below reorder level: low-stock test case
  returning id into v_item_chem002;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost, default_supplier_id)
  values (v_tenant_id, 'SEED-001', 'N19 Seed Cane', 'seed_cane', 'ton', 5, 5, 850.00, v_supplier_canecoop)
  returning id into v_item_seed001;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost, default_supplier_id)
  values (v_tenant_id, 'EQUIP-001', 'Backpack Sprayer 20L', 'equipment', 'each', 2, 6, 1450.00, v_supplier_agrochem)
  returning id into v_item_equip001;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost)
  values (v_tenant_id, 'VEH-001', 'Toyota Hilux (field bakkie)', 'vehicle', 'each', 0, 1, 385000.00)
  returning id into v_item_veh001;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost)
  values (v_tenant_id, 'PLANT-001', 'Massey Ferguson Tractor', 'plant_equipment', 'each', 0, 1, 620000.00)
  returning id into v_item_plant001;

  insert into public.inventory_items (tenant_id, sku, name, category, unit, reorder_level, quantity_on_hand, average_cost)
  values (v_tenant_id, 'OTH-001', 'Cane Knives', 'other', 'each', 10, 25, 45.00)
  returning id into v_item_oth001;

  -- Opening-balance stock movements, one per item, backdated a week so the
  -- ledger view has some history before "today".
  insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, created_at)
  values
    (v_tenant_id, v_item_fert001, 'receipt', 45, 350.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_fert002, 'receipt', 8, 420.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_chem001, 'receipt', 60, 85.50, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_chem002, 'receipt', 4, 120.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_seed001, 'receipt', 5, 850.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_equip001, 'receipt', 6, 1450.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_veh001, 'receipt', 1, 385000.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_plant001, 'receipt', 1, 620000.00, 'Opening balance (seed data)', now() - interval '7 days'),
    (v_tenant_id, v_item_oth001, 'receipt', 25, 45.00, 'Opening balance (seed data)', now() - interval '7 days');

  -- 3. Purchase orders ------------------------------------------------------

  -- (a) Issued, awaiting delivery — use this one to test
  --     "Receive goods" (receive_purchase_order_lines) from the app as
  --     accountant/supervisor.
  insert into public.purchase_orders (tenant_id, supplier_id, po_no, status, order_date, expected_date, notes)
  values (v_tenant_id, v_supplier_greengrow, 'PO-0001', 'issued', current_date - 3, current_date + 4, 'Top-up ahead of top-dressing season')
  returning id into v_po_issued;

  insert into public.purchase_order_lines (purchase_order_id, position, item_id, quantity_ordered, unit_cost)
  values (v_po_issued, 0, v_item_fert001, 50, 350.00);

  -- (b) Draft — use this one to test editing lines and "Issue PO".
  insert into public.purchase_orders (tenant_id, supplier_id, po_no, status, order_date, expected_date, notes)
  values (v_tenant_id, v_supplier_agrochem, 'PO-0002', 'draft', current_date, current_date + 10, 'Restock Mancozeb before spraying window')
  returning id into v_po_draft;

  insert into public.purchase_order_lines (purchase_order_id, position, item_id, quantity_ordered, unit_cost)
  values (v_po_draft, 0, v_item_chem002, 20, 118.00);

  -- (c) Fully received & billed — populates the GRN history and Bills list
  --     with an open bill you can test "Mark as paid" against.
  insert into public.purchase_orders (tenant_id, supplier_id, po_no, status, order_date, expected_date, notes)
  values (v_tenant_id, v_supplier_canecoop, 'PO-0003', 'billed', current_date - 10, current_date - 2, 'Seed cane for new block')
  returning id into v_po_billed;

  insert into public.purchase_order_lines (purchase_order_id, position, item_id, quantity_ordered, quantity_received, unit_cost)
  values (v_po_billed, 0, v_item_seed001, 10, 10, 900.00)
  returning id into v_po_billed_line;

  insert into public.goods_received_notes (tenant_id, purchase_order_id, grn_no, received_date, reference)
  values (v_tenant_id, v_po_billed, v_grn_no, current_date - 2, 'Delivered by co-op truck')
  returning id into v_grn_id;

  -- Weighted-average cost update for the GRN receipt, same formula as
  -- receive_purchase_order_lines() in 0010 §4.
  select quantity_on_hand, average_cost into v_qty_before, v_cost_before from public.inventory_items where id = v_item_seed001;
  v_new_avg_cost := round(((v_qty_before * v_cost_before) + (10 * 900.00)) / (v_qty_before + 10), 2);
  v_new_qty := v_qty_before + 10;

  update public.inventory_items
  set quantity_on_hand = v_new_qty, average_cost = v_new_avg_cost, updated_at = now()
  where id = v_item_seed001;

  insert into public.stock_movements (tenant_id, item_id, movement_type, quantity_delta, unit_cost, reference, created_at)
  values (v_tenant_id, v_item_seed001, 'receipt', 10, 900.00, v_grn_no, now() - interval '2 days')
  returning id into v_grn_line_movement;

  insert into public.goods_received_lines (goods_received_note_id, purchase_order_line_id, item_id, quantity_received, unit_cost, stock_movement_id)
  values (v_grn_id, v_po_billed_line, v_item_seed001, 10, 900.00, v_grn_line_movement);

  insert into public.supplier_bills (tenant_id, supplier_id, goods_received_note_id, bill_no, bill_date, amount, status)
  values (v_tenant_id, v_supplier_canecoop, v_grn_id, 'BILL-SEED-0001', current_date - 2, 9000.00, 'open')
  returning id into v_bill_id;

  update public.goods_received_notes set supplier_bill_id = v_bill_id where id = v_grn_id;

  raise notice 'Inventory test data seeded for tenant %', v_tenant_id;
end $$;
