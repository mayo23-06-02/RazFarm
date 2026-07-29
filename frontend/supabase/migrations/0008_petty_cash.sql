-- Module D: Petty cash monitoring — the slice explicitly deferred by the
-- header comment in 0005_accounts_receivable.sql. One imprest-style fund per
-- tenant, backed by a dedicated "Petty cash" account so it posts into the
-- same general ledger as everything else (0004) and shows up correctly in
-- Reports — balance is simply that account's GL balance, never a separate
-- column that could drift from the books.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.petty_cash_tx_type as enum ('expense', 'replenishment');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.petty_cash_funds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  name text not null default 'Petty cash',
  float_amount numeric(14, 2) not null default 0 check (float_amount >= 0),
  custodian_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table public.petty_cash_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  fund_id uuid not null references public.petty_cash_funds (id) on delete cascade,
  tx_type public.petty_cash_tx_type not null,
  tx_date date not null default current_date,
  description text,
  amount numeric(14, 2) not null check (amount > 0),
  category_account_id uuid not null references public.accounts (id),
  receipt_ref text,
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index petty_cash_transactions_fund_id_idx on public.petty_cash_transactions (fund_id, tx_date desc);

-- ============================================================================
-- 3. Row Level Security (reuses jwt_is_finance_viewer / jwt_is_accountant
--    from 0004 §3)
-- ============================================================================

alter table public.petty_cash_funds enable row level security;
alter table public.petty_cash_transactions enable row level security;

create policy petty_cash_funds_select on public.petty_cash_funds
  for select using (public.jwt_is_finance_viewer(tenant_id));

create policy petty_cash_funds_write on public.petty_cash_funds
  for all using (public.jwt_is_accountant(tenant_id))
  with check (public.jwt_is_accountant(tenant_id));

create policy petty_cash_transactions_select on public.petty_cash_transactions
  for select using (public.jwt_is_finance_viewer(tenant_id));

-- Transactions are only ever created via the RPCs below (which post the
-- matching journal entry in the same transaction) — no direct
-- insert/update/delete policy is granted for app roles.

create trigger set_petty_cash_funds_updated_at
  before update on public.petty_cash_funds
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. RPCs — setup_petty_cash_fund, record_petty_cash_expense,
--    record_petty_cash_replenishment
--
-- All three are security definer so they can post journal entries (which
-- ordinarily only chairman/treasurer can post) on the accountant's behalf —
-- these are system-generated postings tied 1:1 to a petty cash transaction,
-- not freeform journal entries, so the normal segregation-of-duties check
-- doesn't apply to them (same reasoning as record_invoice_payment in 0005).
-- ============================================================================

create or replace function public.setup_petty_cash_fund(
  p_tenant_id uuid,
  p_float_amount numeric,
  p_custodian_name text,
  p_source_account_id uuid
)
returns public.petty_cash_funds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_fund public.petty_cash_funds%rowtype;
  v_entry_id uuid;
begin
  if not public.jwt_is_accountant(p_tenant_id) then
    raise exception 'Only the accountant can set up petty cash';
  end if;

  if exists (select 1 from public.petty_cash_funds where tenant_id = p_tenant_id) then
    raise exception 'Petty cash is already set up for this association';
  end if;

  if p_float_amount < 0 then
    raise exception 'The float amount can''t be negative';
  end if;

  select id into v_account_id from public.accounts where tenant_id = p_tenant_id and code = '1015';
  if not found then
    insert into public.accounts (tenant_id, code, name, type)
    values (p_tenant_id, '1015', 'Petty cash', 'asset')
    returning id into v_account_id;
  end if;

  insert into public.petty_cash_funds (tenant_id, account_id, float_amount, custodian_name)
  values (p_tenant_id, v_account_id, p_float_amount, p_custodian_name)
  returning * into v_fund;

  if p_float_amount > 0 then
    if p_source_account_id is null then
      raise exception 'Choose which account the opening float is coming from';
    end if;

    insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
    values (p_tenant_id, 'PCF-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), current_date, 'Petty cash opening float', 'posted', auth.uid(), auth.uid(), now())
    returning id into v_entry_id;

    insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
    values (v_entry_id, v_account_id, 'Petty cash opening float', p_float_amount, 0);
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, p_source_account_id, 'Petty cash opening float', p_float_amount, 1);
  end if;

  return v_fund;
end;
$$;

grant execute on function public.setup_petty_cash_fund(uuid, numeric, text, uuid) to authenticated;

create or replace function public.record_petty_cash_expense(
  p_fund_id uuid,
  p_tx_date date,
  p_description text,
  p_amount numeric,
  p_category_account_id uuid,
  p_receipt_ref text
)
returns public.petty_cash_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fund public.petty_cash_funds%rowtype;
  v_balance numeric(14, 2);
  v_entry_id uuid;
  v_tx public.petty_cash_transactions%rowtype;
begin
  select * into v_fund from public.petty_cash_funds where id = p_fund_id;
  if not found then
    raise exception 'Petty cash fund not found';
  end if;
  if not public.jwt_is_accountant(v_fund.tenant_id) then
    raise exception 'Only the accountant can record petty cash expenses';
  end if;
  if p_amount <= 0 then
    raise exception 'The expense amount must be positive';
  end if;

  select coalesce(sum(debit), 0) - coalesce(sum(credit), 0) into v_balance
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.journal_entry_id
  where jl.account_id = v_fund.account_id and je.status = 'posted';

  if p_amount > v_balance then
    raise exception 'This expense (%) would overdraw petty cash, which only has % available', p_amount, v_balance;
  end if;

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_fund.tenant_id, 'PCE-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), p_tx_date, coalesce(p_description, 'Petty cash expense'), 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, p_category_account_id, p_description, p_amount, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_fund.account_id, p_description, p_amount, 1);

  insert into public.petty_cash_transactions (tenant_id, fund_id, tx_type, tx_date, description, amount, category_account_id, receipt_ref, journal_entry_id, created_by)
  values (v_fund.tenant_id, p_fund_id, 'expense', p_tx_date, p_description, p_amount, p_category_account_id, p_receipt_ref, v_entry_id, auth.uid())
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.record_petty_cash_expense(uuid, date, text, numeric, uuid, text) to authenticated;

create or replace function public.record_petty_cash_replenishment(
  p_fund_id uuid,
  p_tx_date date,
  p_description text,
  p_amount numeric,
  p_source_account_id uuid,
  p_receipt_ref text
)
returns public.petty_cash_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fund public.petty_cash_funds%rowtype;
  v_entry_id uuid;
  v_tx public.petty_cash_transactions%rowtype;
begin
  select * into v_fund from public.petty_cash_funds where id = p_fund_id;
  if not found then
    raise exception 'Petty cash fund not found';
  end if;
  if not public.jwt_is_accountant(v_fund.tenant_id) then
    raise exception 'Only the accountant can record petty cash top-ups';
  end if;
  if p_amount <= 0 then
    raise exception 'The top-up amount must be positive';
  end if;

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_fund.tenant_id, 'PCR-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), p_tx_date, coalesce(p_description, 'Petty cash top-up'), 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_fund.account_id, p_description, p_amount, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, p_source_account_id, p_description, p_amount, 1);

  insert into public.petty_cash_transactions (tenant_id, fund_id, tx_type, tx_date, description, amount, category_account_id, receipt_ref, journal_entry_id, created_by)
  values (v_fund.tenant_id, p_fund_id, 'replenishment', p_tx_date, p_description, p_amount, p_source_account_id, p_receipt_ref, v_entry_id, auth.uid())
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.record_petty_cash_replenishment(uuid, date, text, numeric, uuid, text) to authenticated;
