-- Poultry phase 0: a tenant can be a sugarcane association, a broiler farm, or both.
-- Existing rows stay sugarcane associations. Mill stays required; poultry
-- registration stores mill 'other' and does not ask the question in the UI.

create type public.enterprise_kind as enum ('sugarcane_association', 'poultry_farm', 'mixed');

alter table public.tenants
  add column enterprise_kind public.enterprise_kind not null default 'sugarcane_association';

alter table public.tenant_settings
  add column poultry_bird_cap integer not null default 400 check (poultry_bird_cap > 0);

-- Replace the 3-arg function so poultry signup can pass a kind. The default
-- keeps every existing caller (cane registration) on the same path.
drop function public.register_association(text, text, public.mill_name);

create function public.register_association(
  p_name text,
  p_slug text,
  p_mill public.mill_name,
  p_enterprise_kind public.enterprise_kind default 'sugarcane_association'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_mill public.mill_name := p_mill;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create an association';
  end if;

  if p_enterprise_kind = 'poultry_farm' then
    v_mill := 'other';
  end if;

  insert into public.tenants (name, slug, mill, enterprise_kind)
  values (p_name, p_slug, v_mill, p_enterprise_kind)
  returning id into v_tenant_id;

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id);

  insert into public.memberships (tenant_id, user_id, role, status)
  values (v_tenant_id, auth.uid(), 'chairman', 'active');

  return v_tenant_id;
end;
$$;

grant execute on function public.register_association(text, text, public.mill_name, public.enterprise_kind) to authenticated;
