-- Mabule Farm sample data.
--
-- Run this in the Supabase SQL editor as postgres, after migrations 0017–0022.
-- It does not create a login or a tenant. Point it at a poultry tenant that
-- already exists and at a user who is already an active member of that tenant
-- (the chairman who registered the farm is the usual choice).
--
-- What a first run creates
--   * House code OLD, name "Old house": a combined brooder-and-pens house, 400 birds.
--   * Pen A in that house, capacity 200. The sample batch is left in the brooder
--     (no pen) so you can try Move to pen.
--   * Stock, only if that SKU is not already on the tenant:
--       FEED-START  Starter 50 kg            bag   50 kg   E520   8 on hand
--       FEED-GROW   Grower/finisher 50 kg    bag   50 kg   E490   8 on hand
--       VAC-GUM     Gumboro                  each          E115   2 on hand
--       VAC-NCD     Newcastle                each          E190   2 on hand
--   * Batch B-MABULE-01: 2 boxes, 200 chicks, placed 16 days ago, still active,
--     chick cost E0 (no journal). Vaccination tasks are copied from the farm
--     template. If the tenant has no template yet, the standard three rows
--     (Newcastle day 7, Gumboro day 14, Newcastle booster day 21) are inserted
--     first.
--
-- Re-running is safe. Existing house, pen, SKUs and the batch are left as they
-- are, including quantities you have since received or issued. It will not
-- restock, re-date the batch, or post a second chick journal.

do $$
declare
  -- Replace both ids, then run the file.
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000000';
  v_user_id uuid := '00000000-0000-0000-0000-000000000000';

  v_kind public.enterprise_kind;
  v_house uuid;
  v_pen uuid;
  v_batch uuid;
begin
  if v_tenant_id = '00000000-0000-0000-0000-000000000000'
     or v_user_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Edit v_tenant_id and v_user_id at the top of poultry_mabule_seed.sql before running it';
  end if;

  select enterprise_kind into v_kind from public.tenants where id = v_tenant_id;
  if not found then
    raise exception 'No tenant with id %', v_tenant_id;
  end if;
  if v_kind not in ('poultry_farm', 'mixed') then
    raise exception 'Tenant % is a % workspace. Set enterprise_kind to poultry_farm before seeding Mabule.', v_tenant_id, v_kind;
  end if;
  if not exists (
    select 1 from public.memberships
    where tenant_id = v_tenant_id and user_id = v_user_id and status = 'active'
  ) then
    raise exception 'User % is not an active member of tenant %', v_user_id, v_tenant_id;
  end if;

  if not exists (select 1 from public.poultry_health_protocols where tenant_id = v_tenant_id) then
    insert into public.poultry_health_protocols (tenant_id, day_of_age, name, sort_order)
    values
      (v_tenant_id, 7, 'Newcastle', 1),
      (v_tenant_id, 14, 'Gumboro', 2),
      (v_tenant_id, 21, 'Newcastle booster', 3);
  end if;

  select id into v_house
  from public.poultry_houses
  where tenant_id = v_tenant_id and code = 'OLD';

  if v_house is null then
    insert into public.poultry_houses (tenant_id, code, name, house_type, capacity_birds)
    values (v_tenant_id, 'OLD', 'Old house', 'combined', 400)
    returning id into v_house;
  end if;

  select id into v_pen
  from public.poultry_pens
  where house_id = v_house and code = 'A';

  if v_pen is null then
    insert into public.poultry_pens (tenant_id, house_id, code, name, capacity_birds)
    values (v_tenant_id, v_house, 'A', 'Pen A', 200)
    returning id into v_pen;
  end if;

  insert into public.inventory_items (
    tenant_id, sku, name, category, unit, unit_weight_kg, average_cost, quantity_on_hand, reorder_level
  )
  select v_tenant_id, v.sku, v.name, v.category::public.inventory_item_category, v.unit, v.unit_weight_kg, v.average_cost, v.quantity_on_hand, v.reorder_level
  from (
    values
      ('FEED-START', 'Starter 50 kg', 'feed', 'bag', 50::numeric, 520::numeric, 8::numeric, 2::numeric),
      ('FEED-GROW', 'Grower/finisher 50 kg', 'feed', 'bag', 50, 490, 8, 2),
      ('VAC-GUM', 'Gumboro', 'vaccine', 'each', null::numeric, 115::numeric, 2::numeric, 1::numeric),
      ('VAC-NCD', 'Newcastle', 'vaccine', 'each', null::numeric, 190::numeric, 2::numeric, 1::numeric)
  ) as v(sku, name, category, unit, unit_weight_kg, average_cost, quantity_on_hand, reorder_level)
  where not exists (
    select 1 from public.inventory_items i
    where i.tenant_id = v_tenant_id and i.sku = v.sku
  );

  select id into v_batch
  from public.poultry_batches
  where tenant_id = v_tenant_id and batch_no = 'B-MABULE-01';

  if v_batch is null then
    insert into public.poultry_batches (
      tenant_id, batch_no, placed_on, house_id, chick_boxes, birds_placed, birds_doa, chick_cost, created_by
    ) values (
      v_tenant_id, 'B-MABULE-01', current_date - 16, v_house, 2, 200, 0, 0, v_user_id
    )
    returning id into v_batch;
  end if;

  raise notice 'Mabule sample ready for tenant %. House %, pen %, batch %.', v_tenant_id, v_house, v_pen, v_batch;
end
$$;
