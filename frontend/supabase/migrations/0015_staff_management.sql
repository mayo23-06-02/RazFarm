-- Staff Management: association employees (payroll) & contractors
-- (cutting/haulage/spraying/other), plus per-job logging for contractors so
-- the deductions engine (D.2) can pull a season's cutting/haulage total
-- instead of a manually guessed figure. Deliberately separate from
-- public.members (Module E growers) — staff are people the association
-- pays for labour, not people it pays for cane, and mixing the two
-- populations would corrupt both the payout engine (which sums
-- members.shareholding) and payroll (which needs tax fields growers don't
-- have). A person can be both a member and a contractor; the tables stay
-- independent and are only ever linked by phone/national ID for UI
-- convenience, never a foreign key.
--
-- Out of scope this pass (see staff management scope doc): actual PAYE/ENPF
-- computation (lives in Payroll, 7.11 — this module only stores the
-- registration numbers and rate basis), leave/timesheets, and automatic
-- bill generation from contractor_jobs (stubbed — jobs just sit
-- logged/billed, status flipped manually once AP exists).

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.staff_employment_type as enum ('permanent', 'casual');
create type public.staff_pay_frequency as enum ('monthly', 'weekly');
create type public.staff_status as enum ('active', 'suspended', 'terminated');
create type public.contractor_service_type as enum ('cutting', 'haulage', 'spraying', 'other');
create type public.contractor_rate_basis as enum ('per_tonne', 'per_hectare', 'per_job', 'fixed');
create type public.contractor_status as enum ('active', 'inactive');
create type public.contractor_job_status as enum ('logged', 'billed', 'paid');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.staff_employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  staff_no text not null check (char_length(staff_no) between 1 and 20),
  full_name text not null check (char_length(full_name) between 1 and 120),
  national_id text,
  phone text,
  email text,
  position text not null check (char_length(position) between 1 and 80),
  employment_type public.staff_employment_type not null default 'permanent',
  start_date date not null default current_date,
  end_date date,
  -- {"bank_name": text, "account_number": text, "branch_code": text}. Always
  -- masked in staff_employees_directory below; only reveal_bank_details()
  -- returns it in full, and only to chairman/treasurer/accountant.
  bank_account jsonb,
  pay_rate numeric(12, 2) not null check (pay_rate >= 0),
  pay_frequency public.staff_pay_frequency not null default 'monthly',
  paye_number text,
  enpf_number text,
  status public.staff_status not null default 'active',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, staff_no),
  check (end_date is null or end_date >= start_date)
);

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contractor_no text not null check (char_length(contractor_no) between 1 and 20),
  business_name text not null check (char_length(business_name) between 1 and 120),
  contact_name text,
  phone text,
  email text,
  service_type public.contractor_service_type not null,
  national_id_or_reg_no text,
  bank_account jsonb,
  rate_basis public.contractor_rate_basis not null,
  rate_amount numeric(12, 2) not null check (rate_amount >= 0),
  withholding_applicable boolean not null default false,
  status public.contractor_status not null default 'active',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, contractor_no)
);

-- computed_amount defaults to quantity * the contractor's rate_amount at the
-- time of logging (computed client-side, same "trust the client for simple
-- arithmetic, RLS scopes who can write" shape as other insert-only capture
-- tables — see field_activities/harvest_captures in 0013). is_override lets
-- a manager record a negotiated price that differs from the standard rate,
-- with a mandatory reason. linked_bill_id has no FK yet — Accounts Payable
-- (7.5) doesn't exist; a later migration adds the constraint once it does.
create table public.contractor_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contractor_id uuid not null references public.contractors (id),
  field_id uuid references public.fields (id),
  service_type public.contractor_service_type not null,
  job_date date not null default current_date,
  quantity numeric(12, 2) not null check (quantity > 0),
  computed_amount numeric(12, 2) not null check (computed_amount >= 0),
  is_override boolean not null default false,
  override_reason text,
  status public.contractor_job_status not null default 'logged',
  linked_bill_id uuid,
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (not is_override or override_reason is not null)
);

create index staff_employees_tenant_id_idx on public.staff_employees (tenant_id, status);
create index contractors_tenant_id_idx on public.contractors (tenant_id, status);
create index contractor_jobs_tenant_id_idx on public.contractor_jobs (tenant_id, job_date desc);
create index contractor_jobs_contractor_id_idx on public.contractor_jobs (contractor_id, job_date desc);

-- ============================================================================
-- 3. Role helpers — chairman/treasurer/secretary manage both employee and
-- contractor records; accountant reads everything for payroll/AP; supervisor
-- additionally views contractors and logs contractor jobs from the field,
-- but doesn't manage staff records and has no access to employee data at
-- all (design.md Staff Management §1). Bank details stay masked for
-- everyone until an explicit reveal, restricted to chairman/treasurer/
-- accountant only — note secretary can manage a record's other fields but
-- can't reveal its bank account.
-- ============================================================================

create or replace function public.jwt_is_staff_manager(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'secretary']::public.member_role[]);
$$;

create or replace function public.jwt_is_staff_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'secretary', 'accountant']::public.member_role[]);
$$;

create or replace function public.jwt_is_contractor_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'secretary', 'accountant', 'supervisor']::public.member_role[]);
$$;

create or replace function public.jwt_is_contractor_job_logger(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'secretary', 'supervisor']::public.member_role[]);
$$;

create or replace function public.jwt_can_reveal_bank_details(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'accountant']::public.member_role[]);
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.staff_employees enable row level security;
alter table public.contractors enable row level security;
alter table public.contractor_jobs enable row level security;

-- Employment and contractor records are never deleted (payroll/AP history
-- must not orphan) — no delete policy is granted for any table below.

create policy staff_employees_select on public.staff_employees
  for select using (public.jwt_is_staff_viewer(tenant_id));

create policy staff_employees_insert on public.staff_employees
  for insert with check (public.jwt_is_staff_manager(tenant_id));

create policy staff_employees_update on public.staff_employees
  for update using (public.jwt_is_staff_manager(tenant_id))
  with check (public.jwt_is_staff_manager(tenant_id));

create policy contractors_select on public.contractors
  for select using (public.jwt_is_contractor_viewer(tenant_id));

create policy contractors_insert on public.contractors
  for insert with check (public.jwt_is_staff_manager(tenant_id));

create policy contractors_update on public.contractors
  for update using (public.jwt_is_staff_manager(tenant_id))
  with check (public.jwt_is_staff_manager(tenant_id));

create policy contractor_jobs_select on public.contractor_jobs
  for select using (public.jwt_is_contractor_viewer(tenant_id));

-- Insert-only for now — no UI in this pass moves a job past "logged", so no
-- update policy is granted yet either (added alongside the future "generate
-- bill" bulk action).
create policy contractor_jobs_insert on public.contractor_jobs
  for insert with check (public.jwt_is_contractor_job_logger(tenant_id) and recorded_by = auth.uid());

create trigger set_staff_employees_updated_at
  before update on public.staff_employees
  for each row execute function public.set_updated_at();

create trigger set_contractors_updated_at
  before update on public.contractors
  for each row execute function public.set_updated_at();

create trigger audit_staff_employees
  after insert or update or delete on public.staff_employees
  for each row execute function public.audit_row_change();

create trigger audit_contractors
  after insert or update or delete on public.contractors
  for each row execute function public.audit_row_change();

-- ============================================================================
-- 5. Bank-detail masking — column-level care even though RLS is row-level
-- (staff management scope doc §2): the raw bank_account jsonb is never
-- selected directly by the app. Both directory views mask it
-- unconditionally (even for a role that's allowed to reveal it — reveal is
-- always an explicit, audited action, never a passive list/profile read).
-- ============================================================================

create or replace function public.mask_bank_account(p_bank_account jsonb)
returns jsonb
language sql stable
as $$
  select case
    when p_bank_account is null then null
    else jsonb_build_object(
      'bank_name', p_bank_account ->> 'bank_name',
      'account_number', case
        when p_bank_account ->> 'account_number' is null then null
        else '•••• ' || right(p_bank_account ->> 'account_number', 4)
      end
    )
  end;
$$;

-- pay_rate is separately masked (not via reveal — just hidden from the
-- query result) for anyone outside chairman/treasurer/accountant, per the
-- scope doc's employees DataTable spec. security_invoker so the underlying
-- table's RLS (§4) still applies to the caller, not the migration owner.
create view public.staff_employees_directory
with (security_invoker = true) as
select
  id,
  tenant_id,
  staff_no,
  full_name,
  national_id,
  phone,
  email,
  position,
  employment_type,
  start_date,
  end_date,
  case
    when public.jwt_has_role(tenant_id, array['chairman', 'treasurer', 'accountant']::public.member_role[])
      then pay_rate
    else null
  end as pay_rate,
  pay_frequency,
  paye_number,
  enpf_number,
  status,
  public.mask_bank_account(bank_account) as bank_account,
  created_at,
  updated_at
from public.staff_employees;

create view public.contractors_directory
with (security_invoker = true) as
select
  id,
  tenant_id,
  contractor_no,
  business_name,
  contact_name,
  phone,
  email,
  service_type,
  national_id_or_reg_no,
  rate_basis,
  rate_amount,
  withholding_applicable,
  status,
  public.mask_bank_account(bank_account) as bank_account,
  created_at,
  updated_at
from public.contractors;

-- ============================================================================
-- 6. reveal_bank_details() — the one deliberate exception to "audit_log is
-- only ever written by the generic row-change trigger" (0001 §6): a reveal
-- is a read, not an insert/update/delete on staff_employees/contractors, so
-- the trigger can't capture it. This RPC checks the caller's role, then
-- writes its own audit_log row before returning the plaintext bank_account.
-- ============================================================================

create or replace function public.reveal_bank_details(p_entity_type text, p_entity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_bank_account jsonb;
begin
  if p_entity_type = 'staff_employees' then
    select tenant_id, bank_account into v_tenant_id, v_bank_account
    from public.staff_employees where id = p_entity_id;
  elsif p_entity_type = 'contractors' then
    select tenant_id, bank_account into v_tenant_id, v_bank_account
    from public.contractors where id = p_entity_id;
  else
    raise exception 'Unknown entity type: %', p_entity_type;
  end if;

  if v_tenant_id is null then
    raise exception 'Record not found';
  end if;

  if not public.jwt_can_reveal_bank_details(v_tenant_id) then
    raise exception 'Only the chairman, treasurer or accountant can view bank details';
  end if;

  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, before, after)
  values (v_tenant_id, auth.uid(), 'reveal_bank_details', p_entity_type, p_entity_id::text, null, jsonb_build_object('revealed_at', now()));

  return v_bank_account;
end;
$$;

grant execute on function public.reveal_bank_details(text, uuid) to authenticated;
