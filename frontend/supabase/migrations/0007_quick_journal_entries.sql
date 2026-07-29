-- Module D: Tabulated "quick entry" for income/expense — lets a treasurer type
-- a batch of everyday transactions (date, category, description, amount)
-- without knowing debit/credit, and have the system generate correctly
-- balanced draft journal entries underneath. Entries land as drafts so the
-- existing post_journal_entry() segregation-of-duties check (0004) still
-- applies before anything affects the books.

create or replace function public.create_quick_journal_entries(
  p_tenant_id uuid,
  p_offset_account_id uuid,
  p_rows jsonb
)
returns setof public.journal_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_entry public.journal_entries%rowtype;
  v_kind text;
  v_amount numeric(14, 2);
  v_category_account_id uuid;
  v_entry_date date;
  v_description text;
  v_year int;
  v_count int;
begin
  if not public.jwt_is_accountant(p_tenant_id) then
    raise exception 'Only the accountant can record quick entries';
  end if;

  if p_offset_account_id is null then
    raise exception 'Choose the account this batch is posted against';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Provide at least one row';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_kind := v_row->>'kind';
    v_amount := (v_row->>'amount')::numeric(14, 2);
    v_category_account_id := (v_row->>'category_account_id')::uuid;
    v_entry_date := coalesce((v_row->>'entry_date')::date, current_date);
    v_description := nullif(v_row->>'description', '');

    if v_kind not in ('income', 'expense') then
      raise exception 'Each row must be marked income or expense';
    end if;

    if v_amount is null or v_amount <= 0 then
      raise exception 'Each row needs an amount greater than zero';
    end if;

    if v_category_account_id is null then
      raise exception 'Each row needs a category';
    end if;

    v_year := extract(year from v_entry_date);

    select count(*) into v_count
    from public.journal_entries
    where tenant_id = p_tenant_id and entry_no like 'JE-' || v_year || '-%';

    insert into public.journal_entries (tenant_id, entry_no, entry_date, memo, status, created_by)
    values (p_tenant_id, 'JE-' || v_year || '-' || (v_count + 1), v_entry_date, v_description, 'draft', auth.uid())
    returning * into v_entry;

    if v_kind = 'income' then
      insert into public.journal_lines (journal_entry_id, account_id, position, description, debit, credit)
      values
        (v_entry.id, p_offset_account_id, 0, v_description, v_amount, 0),
        (v_entry.id, v_category_account_id, 1, v_description, 0, v_amount);
    else
      insert into public.journal_lines (journal_entry_id, account_id, position, description, debit, credit)
      values
        (v_entry.id, v_category_account_id, 0, v_description, v_amount, 0),
        (v_entry.id, p_offset_account_id, 1, v_description, 0, v_amount);
    end if;

    return next v_entry;
  end loop;

  return;
end;
$$;

grant execute on function public.create_quick_journal_entries(uuid, uuid, jsonb) to authenticated;
