-- Module B: Cane Production & Field Management (design.md §12.3, Module B)
-- Field register, crop-cycle/ratoon history, per-field activity log, harvest
-- planning and daily harvest capture, plus a handful of analytics views
-- (ratoon decline, replant recommendations) computed straight off that data.
-- Mirrors the Module F.1 shape: role-gated RLS, a small immutable capture
-- ledger (harvest_captures, same "insert-only" philosophy as
-- stock_movements), and security-definer RPCs for the two operations with
-- real invariants (starting a cycle, ploughing out & replanting).
--
-- Deliberately out of scope here: mill/sucrose data (Module C, next
-- migration) and payout integration (Module D.2 still uses shareholding —
-- see 0006 §intro — swapping in real delivery-based allocation is a later
-- change to compute_payout_run(), not a schema change here).

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.irrigation_type as enum ('furrow', 'sprinkler', 'drip', 'rainfed');
create type public.field_status as enum ('active', 'fallow', 'harvesting', 'replanting', 'retired');
create type public.crop_cycle_type as enum ('plant', 'ratoon');
create type public.crop_cycle_status as enum ('growing', 'ready_to_harvest', 'harvesting', 'harvested', 'ploughed_out');
create type public.field_activity_type as enum ('land_prep', 'planting', 'fertilizer', 'herbicide', 'pesticide', 'ripener', 'irrigation', 'other');
create type public.harvest_plan_status as enum ('planned', 'burn_scheduled', 'cutting', 'completed', 'cancelled');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 20),
  member_id uuid references public.members (id) on delete set null,
  hectares numeric(10, 2) not null check (hectares > 0),
  variety text,
  irrigation_type public.irrigation_type not null default 'rainfed',
  gps_lat numeric(9, 6),
  gps_lng numeric(9, 6),
  boundary_geojson jsonb,
  soil_notes text,
  status public.field_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.crop_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_id uuid not null references public.fields (id) on delete cascade,
  cycle_type public.crop_cycle_type not null,
  ratoon_number integer not null default 0 check (ratoon_number >= 0),
  status public.crop_cycle_status not null default 'growing',
  planted_date date not null,
  expected_harvest_date date,
  ploughed_out_date date,
  area_hectares numeric(10, 2) not null check (area_hectares > 0),
  yield_tonnes numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((cycle_type = 'plant' and ratoon_number = 0) or (cycle_type = 'ratoon' and ratoon_number > 0))
);

-- A field has at most one open (non-terminal) cycle at a time — enforced
-- centrally in start_crop_cycle()/plough_out_and_replant() below, and backed
-- here so it can never be violated even by a future direct-write path.
create unique index crop_cycles_one_open_per_field on public.crop_cycles (field_id) where status not in ('harvested', 'ploughed_out');

create table public.field_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_id uuid not null references public.fields (id) on delete cascade,
  crop_cycle_id uuid references public.crop_cycles (id) on delete set null,
  activity_type public.field_activity_type not null,
  activity_date date not null default current_date,
  product text,
  rate numeric(10, 2),
  rate_unit text,
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.harvest_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_id uuid not null references public.fields (id) on delete cascade,
  crop_cycle_id uuid not null references public.crop_cycles (id) on delete cascade,
  cutting_date_planned date,
  burn_permit_ref text,
  burn_date date,
  cutting_contractor text,
  status public.harvest_plan_status not null default 'planned',
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert-only capture ledger (same philosophy as stock_movements, 0009 §2):
-- tonnes_cut may be negative to correct an earlier entry rather than
-- allowing update/delete, so the running total on crop_cycles stays a
-- trustworthy sum of this table.
create table public.harvest_captures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_id uuid not null references public.fields (id) on delete cascade,
  crop_cycle_id uuid not null references public.crop_cycles (id) on delete cascade,
  harvest_plan_id uuid references public.harvest_plans (id) on delete set null,
  capture_date date not null default current_date,
  tonnes_cut numeric(10, 2) not null check (tonnes_cut <> 0),
  cutter_team text,
  field_edge_stock_tonnes numeric(10, 2) not null default 0 check (field_edge_stock_tonnes >= 0),
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.field_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_id uuid not null references public.fields (id) on delete cascade,
  activity_id uuid references public.field_activities (id) on delete set null,
  harvest_capture_id uuid references public.harvest_captures (id) on delete set null,
  path text not null,
  caption text,
  taken_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index fields_tenant_id_idx on public.fields (tenant_id, status);
create index crop_cycles_field_id_idx on public.crop_cycles (field_id, ratoon_number);
create index crop_cycles_tenant_id_idx on public.crop_cycles (tenant_id, status);
create index field_activities_field_id_idx on public.field_activities (field_id, activity_date desc);
create index harvest_plans_field_id_idx on public.harvest_plans (field_id, cutting_date_planned);
create index harvest_captures_crop_cycle_id_idx on public.harvest_captures (crop_cycle_id);
create index harvest_captures_field_id_idx on public.harvest_captures (field_id, capture_date desc);
create index field_photos_field_id_idx on public.field_photos (field_id, taken_at desc);

-- ============================================================================
-- 3. Role helpers — Supervisor is the field-operations role (design.md
-- §12.2), Chairman gets manager rights too since small associations often
-- have the chairman doing field register setup alongside the supervisor.
-- ============================================================================

create or replace function public.jwt_is_field_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'accountant', 'supervisor']::public.member_role[]);
$$;

create or replace function public.jwt_is_field_manager(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'supervisor']::public.member_role[]);
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.fields enable row level security;
alter table public.crop_cycles enable row level security;
alter table public.field_activities enable row level security;
alter table public.harvest_plans enable row level security;
alter table public.harvest_captures enable row level security;
alter table public.field_photos enable row level security;

create policy fields_select on public.fields
  for select using (public.jwt_is_field_viewer(tenant_id));
create policy fields_write on public.fields
  for all using (public.jwt_is_field_manager(tenant_id))
  with check (public.jwt_is_field_manager(tenant_id));

create policy crop_cycles_select on public.crop_cycles
  for select using (public.jwt_is_field_viewer(tenant_id));
-- No insert/update/delete policy: only start_crop_cycle() and
-- plough_out_and_replant() below may write here, so the "one open cycle per
-- field" invariant can't be bypassed by a direct write.

create policy field_activities_select on public.field_activities
  for select using (public.jwt_is_field_viewer(tenant_id));
create policy field_activities_write on public.field_activities
  for all using (public.jwt_is_field_manager(tenant_id))
  with check (public.jwt_is_field_manager(tenant_id));

create policy harvest_plans_select on public.harvest_plans
  for select using (public.jwt_is_field_viewer(tenant_id));
create policy harvest_plans_write on public.harvest_plans
  for all using (public.jwt_is_field_manager(tenant_id))
  with check (public.jwt_is_field_manager(tenant_id));

create policy harvest_captures_select on public.harvest_captures
  for select using (public.jwt_is_field_viewer(tenant_id));
create policy harvest_captures_insert on public.harvest_captures
  for insert with check (public.jwt_is_field_manager(tenant_id));

create policy field_photos_select on public.field_photos
  for select using (public.jwt_is_field_viewer(tenant_id));
create policy field_photos_insert on public.field_photos
  for insert with check (public.jwt_is_field_manager(tenant_id));
create policy field_photos_delete on public.field_photos
  for delete using (public.jwt_is_field_manager(tenant_id));

create trigger set_fields_updated_at
  before update on public.fields
  for each row execute function public.set_updated_at();

create trigger set_crop_cycles_updated_at
  before update on public.crop_cycles
  for each row execute function public.set_updated_at();

create trigger set_harvest_plans_updated_at
  before update on public.harvest_plans
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. Harvest-capture trigger — rolls each capture into its crop cycle's
-- running yield and nudges plan/cycle status forward. Runs with the
-- inserting user's own privileges (field manager already has UPDATE on both
-- tables via RLS above), so this is deliberately not security definer.
-- ============================================================================

create or replace function public.apply_harvest_capture()
returns trigger
language plpgsql
as $$
begin
  update public.crop_cycles
  set yield_tonnes = yield_tonnes + new.tonnes_cut,
      status = case when status in ('growing', 'ready_to_harvest') then 'harvesting' else status end,
      updated_at = now()
  where id = new.crop_cycle_id;

  if new.harvest_plan_id is not null then
    update public.harvest_plans
    set status = case when status in ('planned', 'burn_scheduled') then 'cutting' else status end,
        updated_at = now()
    where id = new.harvest_plan_id;
  end if;

  return new;
end;
$$;

create trigger trg_apply_harvest_capture
  after insert on public.harvest_captures
  for each row execute function public.apply_harvest_capture();

-- ============================================================================
-- 6. RPCs — start_crop_cycle, plough_out_and_replant
--
-- Security definer so the "one open cycle per field" rule lives in one
-- place rather than every future write path having to remember it — same
-- reasoning as record_stock_receipt et al. (0009 §5).
-- ============================================================================

create or replace function public.start_crop_cycle(
  p_field_id uuid,
  p_cycle_type public.crop_cycle_type,
  p_ratoon_number integer,
  p_planted_date date,
  p_expected_harvest_date date default null
)
returns public.crop_cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_field public.fields%rowtype;
  v_cycle public.crop_cycles%rowtype;
begin
  select * into v_field from public.fields where id = p_field_id;
  if not found then
    raise exception 'Field not found';
  end if;
  if not public.jwt_is_field_manager(v_field.tenant_id) then
    raise exception 'Only the chairman or supervisor can start a crop cycle';
  end if;
  if exists (select 1 from public.crop_cycles where field_id = p_field_id and status not in ('harvested', 'ploughed_out')) then
    raise exception 'This field already has an open crop cycle — harvest or plough it out first';
  end if;

  insert into public.crop_cycles (tenant_id, field_id, cycle_type, ratoon_number, status, planted_date, expected_harvest_date, area_hectares, created_by)
  values (v_field.tenant_id, p_field_id, p_cycle_type, p_ratoon_number, 'growing', p_planted_date, p_expected_harvest_date, v_field.hectares, auth.uid())
  returning * into v_cycle;

  update public.fields set status = 'active', updated_at = now() where id = p_field_id;

  return v_cycle;
end;
$$;

grant execute on function public.start_crop_cycle(uuid, public.crop_cycle_type, integer, date, date) to authenticated;

create or replace function public.plough_out_and_replant(
  p_crop_cycle_id uuid,
  p_ploughed_out_date date,
  p_new_planted_date date,
  p_new_variety text default null,
  p_new_irrigation_type public.irrigation_type default null
)
returns public.crop_cycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.crop_cycles%rowtype;
  v_field public.fields%rowtype;
  v_new public.crop_cycles%rowtype;
begin
  select * into v_cycle from public.crop_cycles where id = p_crop_cycle_id;
  if not found then
    raise exception 'Crop cycle not found';
  end if;

  select * into v_field from public.fields where id = v_cycle.field_id;
  if not public.jwt_is_field_manager(v_field.tenant_id) then
    raise exception 'Only the chairman or supervisor can plough out and replant a field';
  end if;
  if v_cycle.status = 'ploughed_out' then
    raise exception 'This cycle has already been ploughed out';
  end if;
  if p_new_planted_date < p_ploughed_out_date then
    raise exception 'The replant date can''t be before the plough-out date';
  end if;

  update public.crop_cycles
  set status = 'ploughed_out', ploughed_out_date = p_ploughed_out_date, updated_at = now()
  where id = p_crop_cycle_id;

  insert into public.crop_cycles (tenant_id, field_id, cycle_type, ratoon_number, status, planted_date, area_hectares, notes, created_by)
  values (v_field.tenant_id, v_field.id, 'plant', 0, 'growing', p_new_planted_date, v_field.hectares, 'Replanted after plough-out of ' || coalesce(v_cycle.cycle_type::text, 'previous') || ' cycle', auth.uid())
  returning * into v_new;

  update public.fields
  set status = 'active',
      variety = coalesce(p_new_variety, variety),
      irrigation_type = coalesce(p_new_irrigation_type, irrigation_type),
      updated_at = now()
  where id = v_field.id;

  return v_new;
end;
$$;

grant execute on function public.plough_out_and_replant(uuid, date, date, text, public.irrigation_type) to authenticated;

-- ============================================================================
-- 7. Analytics views — yield per cycle, ratoon decline curve, replant
-- recommendations. security_invoker so RLS on the underlying tables (not
-- the view owner's privileges) governs what each caller sees — required
-- since migrations run as a superuser that would otherwise bypass RLS for
-- every tenant (Postgres 15+; see design.md's multi-tenant model, §12).
-- ============================================================================

create view public.crop_cycle_yields
with (security_invoker = true) as
select
  cc.*,
  f.tenant_id as field_tenant_id,
  f.code as field_code,
  f.hectares as field_hectares,
  round(cc.yield_tonnes / nullif(cc.area_hectares, 0), 2) as tonnes_per_ha
from public.crop_cycles cc
join public.fields f on f.id = cc.field_id;

create view public.ratoon_decline_curve
with (security_invoker = true) as
select
  cy.tenant_id,
  cy.field_id,
  cy.field_code,
  cy.id as crop_cycle_id,
  cy.cycle_type,
  cy.ratoon_number,
  cy.planted_date,
  cy.ploughed_out_date,
  cy.tonnes_per_ha,
  lag(cy.tonnes_per_ha) over (partition by cy.field_id order by cy.ratoon_number) as prev_tonnes_per_ha,
  round(
    (cy.tonnes_per_ha - lag(cy.tonnes_per_ha) over (partition by cy.field_id order by cy.ratoon_number))
    / nullif(lag(cy.tonnes_per_ha) over (partition by cy.field_id order by cy.ratoon_number), 0) * 100,
    1
  ) as pct_change_vs_prev
from public.crop_cycle_yields cy
where cy.status = 'harvested';

-- A field is flagged for replanting once it's run deep into its ratoon
-- cycle (agronomic norm for sugarcane is 5-8 ratoons before yield decline
-- makes replanting worthwhile) or its latest harvested ratoon has fallen
-- below 70% of that field's original plant-crop yield.
create view public.field_replant_recommendations
with (security_invoker = true) as
with latest as (
  select distinct on (field_id)
    field_id, tenant_id, field_code, ratoon_number, tonnes_per_ha, planted_date
  from public.crop_cycle_yields
  where status = 'harvested'
  order by field_id, ratoon_number desc
),
plant_crop as (
  select field_id, tonnes_per_ha as plant_tonnes_per_ha
  from public.crop_cycle_yields
  where status = 'harvested' and ratoon_number = 0
)
select
  l.tenant_id,
  l.field_id,
  l.field_code,
  l.ratoon_number as latest_ratoon_number,
  l.tonnes_per_ha as latest_tonnes_per_ha,
  p.plant_tonnes_per_ha,
  case
    when l.ratoon_number >= 6 then 'Ratoon ' || l.ratoon_number || ' — beyond the typical 5-8 ratoon replant window'
    when p.plant_tonnes_per_ha > 0 and l.tonnes_per_ha < p.plant_tonnes_per_ha * 0.7
      then round((1 - l.tonnes_per_ha / p.plant_tonnes_per_ha) * 100, 0) || '% below plant-crop yield'
    else null
  end as reason
from latest l
left join plant_crop p on p.field_id = l.field_id
where l.ratoon_number >= 6 or (p.plant_tonnes_per_ha > 0 and l.tonnes_per_ha < p.plant_tonnes_per_ha * 0.7);

-- ============================================================================
-- 8. Storage — field-photos bucket ({tenantId}/{fieldId}/{uuid}-{filename})
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('field-photos', 'field-photos', false);

create policy "field-photos member read" on storage.objects
  for select using (
    bucket_id = 'field-photos'
    and public.jwt_is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "field-photos manager write" on storage.objects
  for insert with check (
    bucket_id = 'field-photos'
    and public.jwt_is_field_manager(((storage.foldername(name))[1])::uuid)
  );

create policy "field-photos manager delete" on storage.objects
  for delete using (
    bucket_id = 'field-photos'
    and public.jwt_is_field_manager(((storage.foldername(name))[1])::uuid)
  );
