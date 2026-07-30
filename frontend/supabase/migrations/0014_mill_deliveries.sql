-- Module C: Mill Deliveries & Sucrose Tracking (design.md §12.3, Module C)
-- Consignment/delivery notes, manual mill-result capture (tonnes accepted,
-- sucrose %, RV/ERC — statement import is a later slice per design.md),
-- and the analytics that make delivery data useful day to day: field
-- reconciliation (cut vs received, spanning Module B's harvest_captures),
-- a season quota/rate dashboard, and sucrose trend queries feeding
-- <SucroseLine> (already built in components/charts, unused until now).
--
-- Reuses tenants.mill (0001 §2) as the destination enum rather than
-- inventing a mills table, and tenant_settings' existing season_start/
-- season_end (0001) as the season window — this tenant only ever tracks
-- one active season at a time (no historical seasons table exists
-- anywhere yet), so "season delivery dashboard" is a date-range query
-- against those two columns plus the new quota column below, not a new
-- season dimension threaded through every table.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.delivery_status as enum ('dispatched', 'result_captured', 'reconciled');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_id uuid not null references public.fields (id),
  crop_cycle_id uuid references public.crop_cycles (id) on delete set null,
  delivery_no text not null check (char_length(delivery_no) between 1 and 30),
  delivery_date date not null default current_date,
  haulier text,
  vehicle_reg text,
  tonnes_loaded numeric(10, 2) not null check (tonnes_loaded > 0),
  mill public.mill_name not null,
  status public.delivery_status not null default 'dispatched',
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, delivery_no)
);

-- One result per delivery. A separate table (rather than columns on
-- deliveries) keeps "who captured the mill's numbers and when" distinct
-- from "who dispatched the load", and leaves room for the mill-statement
-- import mentioned in design.md to populate `source = 'import'` later.
create table public.mill_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  delivery_id uuid not null unique references public.deliveries (id) on delete cascade,
  tonnes_accepted numeric(10, 2) not null check (tonnes_accepted >= 0),
  sucrose_pct numeric(5, 2) not null check (sucrose_pct >= 0 and sucrose_pct <= 20),
  rv_value numeric(8, 3),
  source text not null default 'manual' check (source in ('manual', 'import')),
  notes text,
  captured_by uuid references auth.users (id),
  captured_at timestamptz not null default now()
);

create index deliveries_tenant_id_idx on public.deliveries (tenant_id, delivery_date desc);
create index deliveries_field_id_idx on public.deliveries (field_id, delivery_date desc);
create index mill_results_delivery_id_idx on public.mill_results (delivery_id);

alter table public.tenant_settings add column season_quota_tonnes numeric(14, 2);

-- ============================================================================
-- 3. Role helpers — Supervisor dispatches loads from the field (design.md
-- §12.2: "records ... deliveries"); capturing what the mill actually paid
-- for is the accountant/treasurer's reconciliation job (D.2), with the
-- chairman able to do either in a small association.
-- ============================================================================

create or replace function public.jwt_is_delivery_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'accountant', 'supervisor']::public.member_role[]);
$$;

create or replace function public.jwt_is_delivery_recorder(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'supervisor']::public.member_role[]);
$$;

create or replace function public.jwt_is_mill_recorder(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'accountant']::public.member_role[]);
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.deliveries enable row level security;
alter table public.mill_results enable row level security;

create policy deliveries_select on public.deliveries
  for select using (public.jwt_is_delivery_viewer(tenant_id));

create policy deliveries_write on public.deliveries
  for all using (public.jwt_is_delivery_recorder(tenant_id) or public.jwt_is_mill_recorder(tenant_id))
  with check (public.jwt_is_delivery_recorder(tenant_id) or public.jwt_is_mill_recorder(tenant_id));

create policy mill_results_select on public.mill_results
  for select using (public.jwt_is_delivery_viewer(tenant_id));

-- No direct insert/update policy — only record_mill_result() below, so the
-- 1:1 relationship with deliveries and the delivery-status transition it
-- drives can't be bypassed by a direct write (same reasoning as
-- crop_cycles in 0013 §4).

create trigger set_deliveries_updated_at
  before update on public.deliveries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. RPCs — record_mill_result, reconcile_delivery
-- ============================================================================

create or replace function public.record_mill_result(
  p_delivery_id uuid,
  p_tonnes_accepted numeric,
  p_sucrose_pct numeric,
  p_rv_value numeric default null,
  p_notes text default null
)
returns public.mill_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_result public.mill_results%rowtype;
begin
  select * into v_delivery from public.deliveries where id = p_delivery_id;
  if not found then
    raise exception 'Delivery not found';
  end if;
  if not public.jwt_is_mill_recorder(v_delivery.tenant_id) then
    raise exception 'Only the chairman, treasurer or accountant can capture mill results';
  end if;
  if v_delivery.status = 'reconciled' then
    raise exception 'This delivery is already reconciled — results can''t be changed';
  end if;

  insert into public.mill_results (tenant_id, delivery_id, tonnes_accepted, sucrose_pct, rv_value, notes, captured_by)
  values (v_delivery.tenant_id, p_delivery_id, p_tonnes_accepted, p_sucrose_pct, p_rv_value, p_notes, auth.uid())
  on conflict (delivery_id) do update
    set tonnes_accepted = excluded.tonnes_accepted,
        sucrose_pct = excluded.sucrose_pct,
        rv_value = excluded.rv_value,
        notes = excluded.notes,
        captured_by = excluded.captured_by,
        captured_at = now()
  returning * into v_result;

  update public.deliveries
  set status = 'result_captured', updated_at = now()
  where id = p_delivery_id and status = 'dispatched';

  return v_result;
end;
$$;

grant execute on function public.record_mill_result(uuid, numeric, numeric, numeric, text) to authenticated;

create or replace function public.reconcile_delivery(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.deliveries%rowtype;
begin
  select * into v_delivery from public.deliveries where id = p_delivery_id;
  if not found then
    raise exception 'Delivery not found';
  end if;
  if not public.jwt_is_mill_recorder(v_delivery.tenant_id) then
    raise exception 'Only the chairman, treasurer or accountant can reconcile a delivery';
  end if;
  if v_delivery.status <> 'result_captured' then
    raise exception 'Capture the mill result before reconciling this delivery';
  end if;

  update public.deliveries
  set status = 'reconciled', updated_at = now()
  where id = p_delivery_id
  returning * into v_delivery;

  return v_delivery;
end;
$$;

grant execute on function public.reconcile_delivery(uuid) to authenticated;

-- ============================================================================
-- 6. Views — delivery_details (join once, reuse everywhere in the UI) and
-- field_delivery_reconciliation (Module B harvest_captures vs Module C
-- deliveries/mill_results — the "did what left the field match what the
-- mill paid for" check design.md calls for). security_invoker for the same
-- reason as 0013 §7.
-- ============================================================================

create view public.delivery_details
with (security_invoker = true) as
select
  d.id,
  d.tenant_id,
  d.field_id,
  f.code as field_code,
  f.variety as field_variety,
  d.crop_cycle_id,
  d.delivery_no,
  d.delivery_date,
  d.haulier,
  d.vehicle_reg,
  d.tonnes_loaded,
  d.mill,
  d.status,
  d.notes,
  d.created_by,
  d.created_at,
  mr.id as mill_result_id,
  mr.tonnes_accepted,
  mr.sucrose_pct,
  mr.rv_value,
  mr.source as mill_result_source,
  mr.notes as mill_result_notes,
  mr.captured_by as mill_result_captured_by,
  mr.captured_at as mill_result_captured_at
from public.deliveries d
join public.fields f on f.id = d.field_id
left join public.mill_results mr on mr.delivery_id = d.id;

create view public.field_delivery_reconciliation
with (security_invoker = true) as
select
  f.tenant_id,
  f.id as field_id,
  f.code as field_code,
  coalesce(hc.total_cut, 0) as tonnes_cut,
  coalesce(dl.total_loaded, 0) as tonnes_loaded,
  coalesce(ar.total_accepted, 0) as tonnes_accepted,
  coalesce(hc.total_cut, 0) - coalesce(ar.total_accepted, 0) as variance_tonnes,
  case when coalesce(hc.total_cut, 0) > 0 then round((coalesce(ar.total_accepted, 0) / hc.total_cut) * 100, 1) else null end as recovery_pct
from public.fields f
left join (
  select field_id, sum(tonnes_cut) as total_cut from public.harvest_captures group by field_id
) hc on hc.field_id = f.id
left join (
  select field_id, sum(tonnes_loaded) as total_loaded from public.deliveries group by field_id
) dl on dl.field_id = f.id
left join (
  select d.field_id, sum(mr.tonnes_accepted) as total_accepted
  from public.mill_results mr
  join public.deliveries d on d.id = mr.delivery_id
  group by d.field_id
) ar on ar.field_id = f.id;
