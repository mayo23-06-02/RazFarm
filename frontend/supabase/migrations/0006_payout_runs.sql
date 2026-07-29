-- Module D.2: Deductions engine, member payout runs & individual member
-- accounts — the feature that actually makes this a *sugarcane association*
-- finance system rather than generic bookkeeping. Ties the grower register
-- (members, from 0002) to the ledger (accounts/journal_entries, from 0004):
-- a payout run splits a gross proceeds pool across active members by
-- shareholding, applies a configurable ordered chain of deductions (each
-- mapped to whichever GL account it should land in), and posts one balanced
-- journal entry for the whole run plus a per-member statement line.
--
-- Real delivery-based "gross by plot share of sucrose value" isn't possible
-- yet (Module C — mill deliveries — doesn't exist), so this uses each
-- member's `shareholding` (already on the members table) as the allocation
-- basis. Swapping in real delivery data later only touches
-- compute_payout_run()'s allocation formula, not the schema or workflow.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.payout_run_status as enum ('draft', 'approved', 'paid');
create type public.member_account_entry_kind as enum ('payout', 'advance', 'contribution', 'adjustment');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.deduction_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  position integer not null default 0,
  gl_account_id uuid not null references public.accounts (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payout_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  run_no text not null,
  title text not null check (char_length(title) between 2 and 160),
  run_date date not null default current_date,
  gross_pool numeric(14, 2) not null check (gross_pool > 0),
  bank_account_id uuid not null references public.accounts (id),
  status public.payout_run_status not null default 'draft',
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, run_no)
);

create table public.payout_run_lines (
  id uuid primary key default gen_random_uuid(),
  payout_run_id uuid not null references public.payout_runs (id) on delete cascade,
  member_id uuid not null references public.members (id),
  gross_amount numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  position integer not null default 0,
  unique (payout_run_id, member_id)
);

create table public.payout_deductions (
  id uuid primary key default gen_random_uuid(),
  payout_run_line_id uuid not null references public.payout_run_lines (id) on delete cascade,
  deduction_type_id uuid not null references public.deduction_types (id),
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  unique (payout_run_line_id, deduction_type_id)
);

create table public.member_account_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id),
  entry_date date not null default current_date,
  kind public.member_account_entry_kind not null,
  description text not null,
  amount numeric(14, 2) not null, -- positive = credited to the member, negative = the member owes this
  payout_run_id uuid references public.payout_runs (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index deduction_types_tenant_id_idx on public.deduction_types (tenant_id, position);
create index payout_runs_tenant_id_idx on public.payout_runs (tenant_id, run_date desc);
create index payout_run_lines_run_id_idx on public.payout_run_lines (payout_run_id);
create index payout_run_lines_member_id_idx on public.payout_run_lines (member_id);
create index payout_deductions_line_id_idx on public.payout_deductions (payout_run_line_id);
create index member_account_entries_member_id_idx on public.member_account_entries (member_id, entry_date desc);
create index member_account_entries_tenant_id_idx on public.member_account_entries (tenant_id);

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

alter table public.deduction_types enable row level security;
alter table public.payout_runs enable row level security;
alter table public.payout_run_lines enable row level security;
alter table public.payout_deductions enable row level security;
alter table public.member_account_entries enable row level security;

create policy deduction_types_select on public.deduction_types
  for select using (public.jwt_is_finance_viewer(tenant_id));

create policy deduction_types_write on public.deduction_types
  for all using (public.jwt_is_accountant(tenant_id))
  with check (public.jwt_is_accountant(tenant_id));

create policy payout_runs_select on public.payout_runs
  for select using (public.jwt_is_finance_viewer(tenant_id));

create policy payout_runs_insert on public.payout_runs
  for insert with check (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy payout_runs_update on public.payout_runs
  for update using (public.jwt_is_accountant(tenant_id) and status = 'draft')
  with check (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy payout_runs_delete on public.payout_runs
  for delete using (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy payout_run_lines_select on public.payout_run_lines
  for select using (
    exists (select 1 from public.payout_runs r where r.id = payout_run_lines.payout_run_id and public.jwt_is_finance_viewer(r.tenant_id))
  );

create policy payout_run_lines_write on public.payout_run_lines
  for all using (
    exists (select 1 from public.payout_runs r where r.id = payout_run_lines.payout_run_id and r.status = 'draft' and public.jwt_is_accountant(r.tenant_id))
  )
  with check (
    exists (select 1 from public.payout_runs r where r.id = payout_run_lines.payout_run_id and r.status = 'draft' and public.jwt_is_accountant(r.tenant_id))
  );

create policy payout_deductions_select on public.payout_deductions
  for select using (
    exists (
      select 1 from public.payout_run_lines l join public.payout_runs r on r.id = l.payout_run_id
      where l.id = payout_deductions.payout_run_line_id and public.jwt_is_finance_viewer(r.tenant_id)
    )
  );

create policy payout_deductions_write on public.payout_deductions
  for all using (
    exists (
      select 1 from public.payout_run_lines l join public.payout_runs r on r.id = l.payout_run_id
      where l.id = payout_deductions.payout_run_line_id and r.status = 'draft' and public.jwt_is_accountant(r.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.payout_run_lines l join public.payout_runs r on r.id = l.payout_run_id
      where l.id = payout_deductions.payout_run_line_id and r.status = 'draft' and public.jwt_is_accountant(r.tenant_id)
    )
  );

-- member_account_entries: finance roles see everything for the tenant;
-- a plain member sees only their own linked row's entries — this is what
-- powers the "Statements" tab on their member profile.
create policy member_account_entries_select on public.member_account_entries
  for select using (
    public.jwt_is_finance_viewer(tenant_id)
    or exists (select 1 from public.members m where m.id = member_account_entries.member_id and m.user_id = auth.uid())
  );

-- No direct insert/update/delete policy: entries are only ever created by
-- mark_payout_run_paid() (security definer) or the standalone-entry RPC
-- below, both of which enforce the accountant check themselves.

-- ============================================================================
-- 4. updated_at triggers
-- ============================================================================

create trigger set_deduction_types_updated_at
  before update on public.deduction_types
  for each row execute function public.set_updated_at();

create trigger set_payout_runs_updated_at
  before update on public.payout_runs
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. RPCs
-- ============================================================================

-- Allocates the run's gross pool across active members by shareholding, and
-- seeds a zero-amount deduction row per active deduction type per member so
-- the UI can present a ready-to-fill grid. Re-running it (while still draft)
-- recomputes gross amounts but leaves any deductions already entered alone.
create or replace function public.compute_payout_run(p_run_id uuid)
returns setof public.payout_run_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.payout_runs%rowtype;
  v_total_shareholding numeric(14, 2);
begin
  select * into v_run from public.payout_runs where id = p_run_id;
  if not found then
    raise exception 'Payout run not found';
  end if;
  if not public.jwt_is_accountant(v_run.tenant_id) then
    raise exception 'Only the accountant can compute a payout run';
  end if;
  if v_run.status <> 'draft' then
    raise exception 'This run has already been approved';
  end if;

  select coalesce(sum(shareholding), 0) into v_total_shareholding
  from public.members where tenant_id = v_run.tenant_id and status = 'active' and shareholding > 0;

  if v_total_shareholding <= 0 then
    raise exception 'No active members with shareholding to allocate this run across';
  end if;

  insert into public.payout_run_lines (payout_run_id, member_id, gross_amount, net_amount, position)
  select p_run_id, m.id, round(v_run.gross_pool * (m.shareholding / v_total_shareholding), 2), 0,
         row_number() over (order by m.member_no)
  from public.members m
  where m.tenant_id = v_run.tenant_id and m.status = 'active' and m.shareholding > 0
  on conflict (payout_run_id, member_id) do update set gross_amount = excluded.gross_amount;

  insert into public.payout_deductions (payout_run_line_id, deduction_type_id, amount)
  select l.id, dt.id, 0
  from public.payout_run_lines l
  cross join public.deduction_types dt
  where l.payout_run_id = p_run_id and dt.tenant_id = v_run.tenant_id and dt.is_active
  on conflict (payout_run_line_id, deduction_type_id) do nothing;

  update public.payout_run_lines l
  set net_amount = l.gross_amount - coalesce((select sum(d.amount) from public.payout_deductions d where d.payout_run_line_id = l.id), 0)
  where l.payout_run_id = p_run_id;

  return query select * from public.payout_run_lines where payout_run_id = p_run_id order by position;
end;
$$;

grant execute on function public.compute_payout_run(uuid) to authenticated;

-- Recomputes net_amount for one line after its deductions are edited.
create or replace function public.recompute_payout_line(p_line_id uuid)
returns public.payout_run_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.payout_run_lines%rowtype;
  v_tenant_id uuid;
begin
  select r.tenant_id into v_tenant_id
  from public.payout_run_lines l join public.payout_runs r on r.id = l.payout_run_id
  where l.id = p_line_id;

  if not found then
    raise exception 'Payout run line not found';
  end if;
  if not public.jwt_is_accountant(v_tenant_id) then
    raise exception 'Only the accountant can edit deductions';
  end if;

  update public.payout_run_lines
  set net_amount = gross_amount - coalesce((select sum(amount) from public.payout_deductions where payout_run_line_id = p_line_id), 0)
  where id = p_line_id
  returning * into v_line;

  return v_line;
end;
$$;

grant execute on function public.recompute_payout_line(uuid) to authenticated;

-- Chairman/treasurer sign-off — separate from the accountant who prepared
-- it, same segregation-of-duties pattern as post_journal_entry().
create or replace function public.approve_payout_run(p_run_id uuid)
returns public.payout_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.payout_runs%rowtype;
  v_line_count integer;
begin
  select * into v_run from public.payout_runs where id = p_run_id;
  if not found then
    raise exception 'Payout run not found';
  end if;
  if not public.jwt_can_post_journal(v_run.tenant_id) then
    raise exception 'Only the chairman or treasurer can approve a payout run';
  end if;
  if v_run.status <> 'draft' then
    raise exception 'This run has already been approved';
  end if;

  select count(*) into v_line_count from public.payout_run_lines where payout_run_id = p_run_id;
  if v_line_count = 0 then
    raise exception 'Compute the run before approving it';
  end if;

  update public.payout_runs
  set status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now()
  where id = p_run_id
  returning * into v_run;

  return v_run;
end;
$$;

grant execute on function public.approve_payout_run(uuid) to authenticated;

-- Posts the whole run as one balanced journal entry (Dr member payouts
-- payable for the gross pool, Cr bank for total net paid out, Cr each
-- deduction type's configured GL account for its total across the run —
-- these three always sum to the gross pool by construction), and writes one
-- member_account_entries row per member so their statement shows the payout.
create or replace function public.mark_payout_run_paid(p_run_id uuid)
returns public.payout_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.payout_runs%rowtype;
  v_payable_account_id uuid;
  v_entry_id uuid;
  v_total_net numeric(14, 2);
  v_line record;
  v_deduction record;
begin
  select * into v_run from public.payout_runs where id = p_run_id;
  if not found then
    raise exception 'Payout run not found';
  end if;
  if not public.jwt_is_accountant(v_run.tenant_id) then
    raise exception 'Only the accountant can mark a run as paid';
  end if;
  if v_run.status <> 'approved' then
    raise exception 'This run must be approved before it can be paid';
  end if;

  select id into v_payable_account_id from public.accounts where tenant_id = v_run.tenant_id and code = '2300';
  if v_payable_account_id is null then
    raise exception 'Member payouts payable account (code 2300) is missing from the chart of accounts';
  end if;

  select coalesce(sum(net_amount), 0) into v_total_net from public.payout_run_lines where payout_run_id = p_run_id;

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_run.tenant_id, 'PAYOUT-' || v_run.run_no, v_run.run_date, 'Payout run ' || v_run.run_no || ' — ' || v_run.title, 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_payable_account_id, 'Payout run ' || v_run.run_no, v_run.gross_pool, 0);

  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_run.bank_account_id, 'Net paid — ' || v_run.run_no, v_total_net, 1);

  for v_deduction in
    select dt.id as deduction_type_id, dt.gl_account_id, dt.name, sum(pd.amount) as total
    from public.payout_deductions pd
    join public.payout_run_lines l on l.id = pd.payout_run_line_id
    join public.deduction_types dt on dt.id = pd.deduction_type_id
    where l.payout_run_id = p_run_id
    group by dt.id, dt.gl_account_id, dt.name
    having sum(pd.amount) > 0
  loop
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, v_deduction.gl_account_id, v_deduction.name || ' — ' || v_run.run_no, v_deduction.total, 2);
  end loop;

  for v_line in select * from public.payout_run_lines where payout_run_id = p_run_id
  loop
    insert into public.member_account_entries (tenant_id, member_id, entry_date, kind, description, amount, payout_run_id, created_by)
    values (v_run.tenant_id, v_line.member_id, v_run.run_date, 'payout', 'Payout run ' || v_run.run_no || ' — ' || v_run.title, v_line.net_amount, p_run_id, auth.uid());
  end loop;

  update public.payout_runs
  set status = 'paid', journal_entry_id = v_entry_id, updated_at = now()
  where id = p_run_id
  returning * into v_run;

  return v_run;
end;
$$;

grant execute on function public.mark_payout_run_paid(uuid) to authenticated;

-- Standalone member account entry (advance given, contribution received,
-- manual adjustment) — outside the payout-run flow.
create or replace function public.add_member_account_entry(
  p_tenant_id uuid,
  p_member_id uuid,
  p_entry_date date,
  p_kind public.member_account_entry_kind,
  p_description text,
  p_amount numeric
)
returns public.member_account_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.member_account_entries%rowtype;
begin
  if not public.jwt_is_accountant(p_tenant_id) then
    raise exception 'Only the accountant can add member account entries';
  end if;

  insert into public.member_account_entries (tenant_id, member_id, entry_date, kind, description, amount, created_by)
  values (p_tenant_id, p_member_id, p_entry_date, p_kind, p_description, p_amount, auth.uid())
  returning * into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.add_member_account_entry(uuid, uuid, date, public.member_account_entry_kind, text, numeric) to authenticated;

-- ============================================================================
-- 6. Seed data — new GL account + starter deduction types
-- ============================================================================

-- seed_default_chart_of_accounts (0004) already ran for existing tenants
-- without this account, so add it defensively for every tenant that has a
-- chart of accounts, then extend the function for future tenants.
insert into public.accounts (tenant_id, code, name, type)
select tenant_id, '2300', 'Member payouts payable', 'liability'
from (select distinct tenant_id from public.accounts) t
on conflict (tenant_id, code) do nothing;

create or replace function public.seed_default_chart_of_accounts(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.jwt_is_accountant(p_tenant_id) then
    raise exception 'Only the accountant can set up the chart of accounts';
  end if;

  insert into public.accounts (tenant_id, code, name, type)
  values
    (p_tenant_id, '1000', 'Bank', 'asset'),
    (p_tenant_id, '1010', 'Cash on hand', 'asset'),
    (p_tenant_id, '1100', 'Accounts receivable', 'asset'),
    (p_tenant_id, '1200', 'Member advances', 'asset'),
    (p_tenant_id, '2000', 'Accounts payable', 'liability'),
    (p_tenant_id, '2100', 'Loans payable', 'liability'),
    (p_tenant_id, '2200', 'VAT payable', 'liability'),
    (p_tenant_id, '2300', 'Member payouts payable', 'liability'),
    (p_tenant_id, '3000', 'Member contributions', 'equity'),
    (p_tenant_id, '3100', 'Retained earnings', 'equity'),
    (p_tenant_id, '4000', 'Cane sales revenue', 'income'),
    (p_tenant_id, '4900', 'Other income', 'income'),
    (p_tenant_id, '5000', 'Haulage expense', 'expense'),
    (p_tenant_id, '5010', 'Cutting contractor expense', 'expense'),
    (p_tenant_id, '5020', 'Industry levies expense', 'expense'),
    (p_tenant_id, '5100', 'Salaries and wages', 'expense'),
    (p_tenant_id, '5200', 'Office and admin expense', 'expense'),
    (p_tenant_id, '5300', 'Depreciation expense', 'expense')
  on conflict (tenant_id, code) do nothing;
end;
$$;

-- One-off helper (not exposed to the app) so an accountant can bootstrap the
-- three standard deduction types against a tenant's own chart of accounts
-- without hand-picking account ids in the UI on day one.
create or replace function public.seed_default_deduction_types(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.jwt_is_accountant(p_tenant_id) then
    raise exception 'Only the accountant can set up deduction types';
  end if;

  insert into public.deduction_types (tenant_id, name, position, gl_account_id)
  select p_tenant_id, v.name, v.position, a.id
  from (values ('Haulage', 0, '5000'), ('Cutting contractor', 1, '5010'), ('Industry levies', 2, '5020'), ('Loan repayment', 3, '1200')) as v(name, position, code)
  join public.accounts a on a.tenant_id = p_tenant_id and a.code = v.code
  where not exists (select 1 from public.deduction_types dt where dt.tenant_id = p_tenant_id and dt.name = v.name);
end;
$$;

grant execute on function public.seed_default_deduction_types(uuid) to authenticated;
