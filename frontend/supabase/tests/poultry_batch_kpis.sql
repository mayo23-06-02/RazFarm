-- Hand-run check for the broiler batch numbers.
-- Supabase SQL editor, as postgres. The whole script rolls back, so it
-- leaves no tenant behind. If it stops on an error, run: rollback;

create extension if not exists pgcrypto;
--
-- What it checks (200 placed, 3 deaths, 4 bags × 50 kg, 10 sold at E100,
-- chick cost E1,600, feed at E80/bag):
--   alive 187, mortality 1.5%, feed 200 kg, revenue E1,000,
--   cost E1,920 then E2,420 after E500 firewood, surplus E-1,420,
--   stock on hand 6, three vaccination tasks, Newcastle on day 7,
--   an oversized sale and a wrong close are rejected,
--   closing writes off the birds still alive.

begin;

do $check$
declare
  v_user uuid := gen_random_uuid();
  v_tenant uuid;
  v_house uuid;
  v_item uuid;
  v_cash uuid;
  v_batch public.poultry_batches%rowtype;
  v_summary public.poultry_batch_summary%rowtype;
  v_on_hand numeric;
  v_debit numeric;
  v_credit numeric;
  v_due date;
  v_task uuid;
  v_task_count integer;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user, 'authenticated', 'authenticated',
    'poultry-kpi-' || v_user::text || '@canandledger.test',
    crypt('Test@Poultry123', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Poultry KPI"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  insert into public.tenants (name, slug, mill, enterprise_kind)
  values ('KPI Poultry', 'kpi-poultry-' || substr(v_user::text, 1, 8), 'other', 'poultry_farm')
  returning id into v_tenant;

  insert into public.tenant_settings (tenant_id, poultry_bird_cap)
  values (v_tenant, 400);

  insert into public.memberships (tenant_id, user_id, role, status)
  values (v_tenant, v_user, 'chairman', 'active');

  insert into public.accounts (tenant_id, code, name, type)
  values (v_tenant, '1010', 'Cash on hand', 'asset')
  returning id into v_cash;

  insert into public.poultry_houses (tenant_id, code, name, house_type, capacity_birds)
  values (v_tenant, 'H1', 'House 1', 'combined', 500)
  returning id into v_house;

  insert into public.inventory_items (
    tenant_id, sku, name, category, unit, quantity_on_hand, average_cost, unit_weight_kg
  ) values (
    v_tenant, 'FEED-ST', 'Starter 50kg', 'feed', 'bag', 10, 80, 50
  )
  returning id into v_item;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user::text,
      'role', 'authenticated',
      'tenant_roles', jsonb_build_object(v_tenant::text, jsonb_build_array('chairman'))
    )::text,
    true
  );

  perform public.seed_poultry_health_template(v_tenant);

  v_batch := public.place_poultry_batch(
    v_house, current_date, 2, 200, 0, null, 1600, v_cash, null, null
  );

  perform public.upsert_poultry_daily_log(
    v_batch.id, current_date, 3, 0, v_item, 4, 32, 34
  );

  perform public.record_poultry_sale(
    v_batch.id, current_date, 10, 100, v_cash, 'Gate sale'
  );

  select * into v_summary from public.poultry_batch_summary where id = v_batch.id;
  if v_summary.birds_alive <> 187 then
    raise exception 'Expected 187 alive, got %', v_summary.birds_alive;
  end if;
  if v_summary.mortality_pct <> 1.5 then
    raise exception 'Expected mortality 1.5, got %', v_summary.mortality_pct;
  end if;
  if v_summary.feed_kg <> 200 then
    raise exception 'Expected 200 kg feed, got %', v_summary.feed_kg;
  end if;
  if v_summary.revenue <> 1000 then
    raise exception 'Expected revenue 1000, got %', v_summary.revenue;
  end if;
  if v_summary.cost <> 1920 then
    raise exception 'Expected cost 1920, got %', v_summary.cost;
  end if;
  if v_summary.surplus <> -920 then
    raise exception 'Expected surplus -920, got %', v_summary.surplus;
  end if;
  if v_summary.age_days <> 0 or v_summary.phase <> 'brooding' then
    raise exception 'Expected day 0 brooding, got age % phase %', v_summary.age_days, v_summary.phase;
  end if;

  select quantity_on_hand into v_on_hand from public.inventory_items where id = v_item;
  if v_on_hand <> 6 then
    raise exception 'Expected 6 bags on hand, got %', v_on_hand;
  end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_debit, v_credit
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.journal_entry_id
  where je.tenant_id = v_tenant;
  if v_debit <> v_credit or v_debit <> 2920 then
    raise exception 'Expected balanced journals of 2920, got debit % credit %', v_debit, v_credit;
  end if;

  select count(*) into v_task_count from public.poultry_batch_tasks where batch_id = v_batch.id;
  if v_task_count <> 3 then
    raise exception 'Expected 3 vaccination tasks, got %', v_task_count;
  end if;
  select due_on into v_due from public.poultry_batch_tasks where batch_id = v_batch.id and name = 'Newcastle';
  if v_due <> current_date + 7 then
    raise exception 'Newcastle should be due on day 7, got %', v_due;
  end if;
  select due_on into v_due from public.poultry_batch_tasks where batch_id = v_batch.id and name = 'Gumboro';
  if v_due <> current_date + 14 then
    raise exception 'Gumboro should be due on day 14, got %', v_due;
  end if;

  perform public.add_poultry_batch_cost(v_batch.id, 'firewood', current_date, 500, 'Firewood', v_cash);
  select * into v_summary from public.poultry_batch_summary where id = v_batch.id;
  if v_summary.cost <> 2420 or v_summary.surplus <> -1420 then
    raise exception 'Expected cost 2420 and surplus -1420 after firewood, got % / %', v_summary.cost, v_summary.surplus;
  end if;
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_debit, v_credit
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.journal_entry_id
  where je.tenant_id = v_tenant;
  if v_debit <> v_credit or v_debit <> 3420 then
    raise exception 'Expected balanced journals of 3420 after firewood, got debit % credit %', v_debit, v_credit;
  end if;

  select id into v_task from public.poultry_batch_tasks where batch_id = v_batch.id and name = 'Newcastle';
  perform public.complete_poultry_task(v_task, null, null);
  if not exists (select 1 from public.poultry_batch_tasks where id = v_task and status = 'done') then
    raise exception 'Newcastle task should be marked done';
  end if;

  begin
    perform public.record_poultry_sale(v_batch.id, current_date, 999, 100, v_cash, null);
    raise exception 'Oversized sale should have failed';
  exception
    when others then
      if sqlerrm not like '%still alive%' then
        raise;
      end if;
  end;

  begin
    perform public.close_poultry_batch(v_batch.id, 186, current_date);
    raise exception 'Wrong write-off should have failed';
  exception
    when others then
      if sqlerrm not like '%still alive%' then
        raise;
      end if;
  end;

  begin
    perform public.place_poultry_batch(v_house, current_date, 3, 300, 0, null, 0, null, null, null);
    raise exception 'Placement over the 400 cap should have failed';
  exception
    when others then
      if sqlerrm not like '%cap%' then
        raise;
      end if;
  end;

  perform public.close_poultry_batch(v_batch.id, 187, current_date);
  select * into v_summary from public.poultry_batch_summary where id = v_batch.id;
  if v_summary.status <> 'closed' or v_summary.birds_alive <> 0 then
    raise exception 'Expected a closed batch with 0 alive, got % / %', v_summary.status, v_summary.birds_alive;
  end if;

  begin
    perform public.upsert_poultry_daily_log(v_batch.id, current_date, 0, 0, null, 0, null, null);
    raise exception 'A log on a closed batch should have failed';
  exception
    when others then
      if sqlerrm not like '%closed%' then
        raise;
      end if;
  end;

  raise notice 'poultry batch KPI check passed';
end
$check$;

rollback;
