-- Module D.1: Core Accounting (double-entry general ledger)
-- First slice of the full Finances/Payments/Accounting suite — chart of
-- accounts, a balanced general ledger, and the reports that read it.
-- Deliberately out of scope for this migration (built later on top of this
-- ledger): Accounts Receivable/Payable, banking/reconciliation, fixed
-- assets, payroll, VAT returns, and the cane-specific finance features
-- (deductions engine, payout runs, member accounts) — those all post
-- journals into the tables created here once they exist.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');
create type public.journal_entry_status as enum ('draft', 'posted');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 2 and 120),
  type public.account_type not null,
  parent_id uuid references public.accounts (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entry_no text not null,
  entry_date date not null default current_date,
  memo text,
  status public.journal_entry_status not null default 'draft',
  created_by uuid references auth.users (id),
  posted_by uuid references auth.users (id),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, entry_no)
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  position integer not null default 0,
  description text,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  constraint journal_lines_one_side check (debit = 0 or credit = 0)
);

create index accounts_tenant_id_idx on public.accounts (tenant_id);
create index journal_entries_tenant_id_idx on public.journal_entries (tenant_id, entry_date desc);
create index journal_lines_entry_id_idx on public.journal_lines (journal_entry_id);
create index journal_lines_account_id_idx on public.journal_lines (account_id);

-- ============================================================================
-- 3. Role helper — chairman/treasurer/accountant can view; only accountant
-- drafts entries; posting (chairman/treasurer) is a segregation-of-duties
-- check so the preparer isn't also the approver.
-- ============================================================================

create or replace function public.jwt_is_finance_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer', 'accountant']::public.member_role[]);
$$;

create or replace function public.jwt_is_accountant(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['accountant']::public.member_role[]);
$$;

create or replace function public.jwt_can_post_journal(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'treasurer']::public.member_role[]);
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

create policy accounts_select on public.accounts
  for select using (public.jwt_is_finance_viewer(tenant_id));

create policy accounts_write on public.accounts
  for all using (public.jwt_is_accountant(tenant_id))
  with check (public.jwt_is_accountant(tenant_id));

create policy journal_entries_select on public.journal_entries
  for select using (public.jwt_is_finance_viewer(tenant_id));

-- Drafts are the accountant's workspace: insert/update/delete only while
-- status = 'draft'. Posting flips status via post_journal_entry() below,
-- not a direct update, so there's no "update" path to posted status here.
create policy journal_entries_insert on public.journal_entries
  for insert with check (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy journal_entries_update on public.journal_entries
  for update using (public.jwt_is_accountant(tenant_id) and status = 'draft')
  with check (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy journal_entries_delete on public.journal_entries
  for delete using (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy journal_lines_select on public.journal_lines
  for select using (
    exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.journal_entry_id and public.jwt_is_finance_viewer(e.tenant_id)
    )
  );

create policy journal_lines_write on public.journal_lines
  for all using (
    exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.journal_entry_id
        and e.status = 'draft'
        and public.jwt_is_accountant(e.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.journal_entry_id
        and e.status = 'draft'
        and public.jwt_is_accountant(e.tenant_id)
    )
  );

-- ============================================================================
-- 5. Audit + updated_at triggers (reuses helpers from 0001/0002)
-- ============================================================================

create trigger audit_accounts
  after insert or update or delete on public.accounts
  for each row execute function public.audit_row_change();

create trigger audit_journal_entries
  after insert or update or delete on public.journal_entries
  for each row execute function public.audit_row_change();

create trigger set_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger set_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. RPCs — post_journal_entry (balance-checked posting) and
--    seed_default_chart_of_accounts (agri/co-op starter template)
-- ============================================================================

create or replace function public.post_journal_entry(p_entry_id uuid)
returns public.journal_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.journal_entries%rowtype;
  v_total_debit numeric(14, 2);
  v_total_credit numeric(14, 2);
begin
  select * into v_entry from public.journal_entries where id = p_entry_id;

  if not found then
    raise exception 'Journal entry not found';
  end if;

  if not public.jwt_can_post_journal(v_entry.tenant_id) then
    raise exception 'Only the chairman or treasurer can post journal entries';
  end if;

  if v_entry.status <> 'draft' then
    raise exception 'This entry has already been posted';
  end if;

  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_total_debit, v_total_credit
  from public.journal_lines
  where journal_entry_id = p_entry_id;

  if v_total_debit = 0 and v_total_credit = 0 then
    raise exception 'Add at least one debit and credit line before posting';
  end if;

  if v_total_debit <> v_total_credit then
    raise exception 'Debits (%) must equal credits (%)', v_total_debit, v_total_credit;
  end if;

  update public.journal_entries
  set status = 'posted', posted_by = auth.uid(), posted_at = now()
  where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.post_journal_entry(uuid) to authenticated;

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

grant execute on function public.seed_default_chart_of_accounts(uuid) to authenticated;
