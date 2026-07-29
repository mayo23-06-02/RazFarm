-- Module D.1: Accounts Receivable
-- Customers, invoices (with line items), payments and credit notes — all
-- posting automatically into the general ledger built in 0004. This is the
-- first of the "sits on top of the ledger" pieces from the Module D brief;
-- Accounts Payable, banking, petty cash, fixed assets, payroll and the
-- cane-specific finance features are deliberately not part of this slice.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.invoice_status as enum ('draft', 'sent', 'partial', 'paid', 'void');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  invoice_no text not null,
  issue_date date not null default current_date,
  due_date date not null default (current_date + interval '30 days'),
  status public.invoice_status not null default 'draft',
  vat_rate numeric(5, 4) not null default 0.15,
  notes text,
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, invoice_no)
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null check (char_length(description) between 1 and 200),
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  account_id uuid not null references public.accounts (id)
);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  method text,
  reference text,
  deposit_account_id uuid not null references public.accounts (id),
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  credit_no text not null,
  amount numeric(14, 2) not null check (amount > 0),
  reason text,
  revenue_account_id uuid not null references public.accounts (id),
  issued_at date not null default current_date,
  journal_entry_id uuid references public.journal_entries (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (tenant_id, credit_no)
);

create index customers_tenant_id_idx on public.customers (tenant_id);
create index invoices_tenant_id_idx on public.invoices (tenant_id, due_date);
create index invoices_customer_id_idx on public.invoices (customer_id);
create index invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id);
create index invoice_payments_invoice_id_idx on public.invoice_payments (invoice_id);
create index credit_notes_invoice_id_idx on public.credit_notes (invoice_id);

-- ============================================================================
-- 3. Row Level Security (reuses jwt_is_finance_viewer / jwt_is_accountant
--    from 0004 §3)
-- ============================================================================

alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.credit_notes enable row level security;

create policy customers_select on public.customers
  for select using (public.jwt_is_finance_viewer(tenant_id));

create policy customers_write on public.customers
  for all using (public.jwt_is_accountant(tenant_id))
  with check (public.jwt_is_accountant(tenant_id));

create policy invoices_select on public.invoices
  for select using (public.jwt_is_finance_viewer(tenant_id));

-- Header fields are only directly editable while still a draft; issuing
-- (draft -> sent) happens through issue_invoice() below, not a raw update.
create policy invoices_insert on public.invoices
  for insert with check (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy invoices_update on public.invoices
  for update using (public.jwt_is_accountant(tenant_id) and status = 'draft')
  with check (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy invoices_delete on public.invoices
  for delete using (public.jwt_is_accountant(tenant_id) and status = 'draft');

create policy invoice_lines_select on public.invoice_lines
  for select using (
    exists (select 1 from public.invoices i where i.id = invoice_lines.invoice_id and public.jwt_is_finance_viewer(i.tenant_id))
  );

create policy invoice_lines_write on public.invoice_lines
  for all using (
    exists (select 1 from public.invoices i where i.id = invoice_lines.invoice_id and i.status = 'draft' and public.jwt_is_accountant(i.tenant_id))
  )
  with check (
    exists (select 1 from public.invoices i where i.id = invoice_lines.invoice_id and i.status = 'draft' and public.jwt_is_accountant(i.tenant_id))
  );

create policy invoice_payments_select on public.invoice_payments
  for select using (public.jwt_is_finance_viewer(tenant_id));

create policy credit_notes_select on public.credit_notes
  for select using (public.jwt_is_finance_viewer(tenant_id));

-- Payments and credit notes are only ever created via the RPCs below (which
-- post the matching journal entry in the same transaction) — no direct
-- insert/update/delete policy is granted for app roles.

-- ============================================================================
-- 4. updated_at triggers
-- ============================================================================

create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger set_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. RPCs — issue_invoice, record_invoice_payment, issue_credit_note
--
-- All three are security definer so they can post journal entries (which
-- ordinarily only chairman/treasurer can post) on the accountant's behalf —
-- these are system-generated postings tied 1:1 to an AR document, not
-- freeform journal entries, so the normal segregation-of-duties check
-- doesn't apply to them.
-- ============================================================================

create or replace function public.issue_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_subtotal numeric(14, 2);
  v_vat numeric(14, 2);
  v_total numeric(14, 2);
  v_ar_account_id uuid;
  v_vat_account_id uuid;
  v_entry_id uuid;
  v_line record;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if not public.jwt_is_accountant(v_invoice.tenant_id) then
    raise exception 'Only the accountant can issue invoices';
  end if;
  if v_invoice.status <> 'draft' then
    raise exception 'This invoice has already been issued';
  end if;

  select coalesce(sum(quantity * unit_price), 0) into v_subtotal
  from public.invoice_lines where invoice_id = p_invoice_id;

  if v_subtotal <= 0 then
    raise exception 'Add at least one line before issuing';
  end if;

  v_vat := round(v_subtotal * v_invoice.vat_rate, 2);
  v_total := v_subtotal + v_vat;

  select id into v_ar_account_id from public.accounts where tenant_id = v_invoice.tenant_id and code = '1100';
  if v_ar_account_id is null then
    raise exception 'Accounts receivable account (code 1100) is missing from the chart of accounts';
  end if;

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_invoice.tenant_id, 'INV-' || v_invoice.invoice_no, v_invoice.issue_date, 'Invoice ' || v_invoice.invoice_no, 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, v_ar_account_id, 'Invoice ' || v_invoice.invoice_no, v_total, 0);

  for v_line in select * from public.invoice_lines where invoice_id = p_invoice_id order by position
  loop
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, v_line.account_id, v_line.description, v_line.quantity * v_line.unit_price, v_line.position + 1);
  end loop;

  if v_vat > 0 then
    select id into v_vat_account_id from public.accounts where tenant_id = v_invoice.tenant_id and code = '2200';
    if v_vat_account_id is null then
      raise exception 'VAT payable account (code 2200) is missing from the chart of accounts';
    end if;
    insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
    values (v_entry_id, v_vat_account_id, 'VAT on ' || v_invoice.invoice_no, v_vat, 999);
  end if;

  update public.invoices
  set status = 'sent', journal_entry_id = v_entry_id, updated_at = now()
  where id = p_invoice_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

grant execute on function public.issue_invoice(uuid) to authenticated;

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_paid_at date,
  p_method text,
  p_reference text,
  p_deposit_account_id uuid
)
returns public.invoice_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_total numeric(14, 2);
  v_paid_so_far numeric(14, 2);
  v_credited numeric(14, 2);
  v_ar_account_id uuid;
  v_entry_id uuid;
  v_payment public.invoice_payments%rowtype;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if not public.jwt_is_accountant(v_invoice.tenant_id) then
    raise exception 'Only the accountant can record payments';
  end if;
  if v_invoice.status not in ('sent', 'partial') then
    raise exception 'This invoice is not awaiting payment';
  end if;
  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  select coalesce(sum(quantity * unit_price), 0) * (1 + v_invoice.vat_rate) into v_total
  from public.invoice_lines where invoice_id = p_invoice_id;
  select coalesce(sum(amount), 0) into v_paid_so_far from public.invoice_payments where invoice_id = p_invoice_id;
  select coalesce(sum(amount), 0) into v_credited from public.credit_notes where invoice_id = p_invoice_id;

  if p_amount > (v_total - v_paid_so_far - v_credited) then
    raise exception 'Payment (%) exceeds the outstanding balance (%)', p_amount, (v_total - v_paid_so_far - v_credited);
  end if;

  select id into v_ar_account_id from public.accounts where tenant_id = v_invoice.tenant_id and code = '1100';

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_invoice.tenant_id, 'PMT-' || v_invoice.invoice_no || '-' || to_char(now(), 'HH24MISS'), p_paid_at, 'Payment for ' || v_invoice.invoice_no, 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, p_deposit_account_id, 'Payment received — ' || v_invoice.invoice_no, p_amount, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_ar_account_id, 'Payment received — ' || v_invoice.invoice_no, p_amount, 1);

  insert into public.invoice_payments (tenant_id, invoice_id, amount, paid_at, method, reference, deposit_account_id, journal_entry_id, created_by)
  values (v_invoice.tenant_id, p_invoice_id, p_amount, p_paid_at, p_method, p_reference, p_deposit_account_id, v_entry_id, auth.uid())
  returning * into v_payment;

  update public.invoices
  set status = (case when (v_paid_so_far + v_credited + p_amount) >= v_total then 'paid' else 'partial' end)::invoice_status,
      updated_at = now()
  where id = p_invoice_id;

  return v_payment;
end;
$$;

grant execute on function public.record_invoice_payment(uuid, numeric, date, text, text, uuid) to authenticated;

create or replace function public.issue_credit_note(
  p_invoice_id uuid,
  p_amount numeric,
  p_reason text,
  p_revenue_account_id uuid
)
returns public.credit_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_total numeric(14, 2);
  v_paid_so_far numeric(14, 2);
  v_credited numeric(14, 2);
  v_ar_account_id uuid;
  v_entry_id uuid;
  v_credit_note public.credit_notes%rowtype;
  v_year text;
  v_seq int;
  v_credit_no text;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found';
  end if;
  if not public.jwt_is_accountant(v_invoice.tenant_id) then
    raise exception 'Only the accountant can issue credit notes';
  end if;
  if v_invoice.status not in ('sent', 'partial') then
    raise exception 'This invoice has no outstanding balance to credit';
  end if;
  if p_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  select coalesce(sum(quantity * unit_price), 0) * (1 + v_invoice.vat_rate) into v_total
  from public.invoice_lines where invoice_id = p_invoice_id;
  select coalesce(sum(amount), 0) into v_paid_so_far from public.invoice_payments where invoice_id = p_invoice_id;
  select coalesce(sum(amount), 0) into v_credited from public.credit_notes where invoice_id = p_invoice_id;

  if p_amount > (v_total - v_paid_so_far - v_credited) then
    raise exception 'Credit (%) exceeds the outstanding balance (%)', p_amount, (v_total - v_paid_so_far - v_credited);
  end if;

  v_year := to_char(now(), 'YYYY');
  select count(*) + 1 into v_seq from public.credit_notes where tenant_id = v_invoice.tenant_id and credit_no like 'CN-' || v_year || '-%';
  v_credit_no := 'CN-' || v_year || '-' || v_seq;

  select id into v_ar_account_id from public.accounts where tenant_id = v_invoice.tenant_id and code = '1100';

  insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by, posted_by, posted_at)
  values (v_invoice.tenant_id, v_credit_no, current_date, 'Credit note against ' || v_invoice.invoice_no || coalesce(': ' || p_reason, ''), 'posted', auth.uid(), auth.uid(), now())
  returning id into v_entry_id;

  insert into public.journal_lines (journal_entry_id, account_id, description, debit, position)
  values (v_entry_id, p_revenue_account_id, 'Credit note ' || v_credit_no, p_amount, 0);
  insert into public.journal_lines (journal_entry_id, account_id, description, credit, position)
  values (v_entry_id, v_ar_account_id, 'Credit note ' || v_credit_no, p_amount, 1);

  insert into public.credit_notes (tenant_id, invoice_id, credit_no, amount, reason, revenue_account_id, journal_entry_id, created_by)
  values (v_invoice.tenant_id, p_invoice_id, v_credit_no, p_amount, p_reason, p_revenue_account_id, v_entry_id, auth.uid())
  returning * into v_credit_note;

  update public.invoices
  set status = (case when (v_paid_so_far + v_credited + p_amount) >= v_total then 'paid' else 'partial' end)::invoice_status,
      updated_at = now()
  where id = p_invoice_id;

  return v_credit_note;
end;
$$;

grant execute on function public.issue_credit_note(uuid, numeric, text, uuid) to authenticated;
