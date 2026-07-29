-- Module A: Tenant & Access Management
-- Sugarcane grower association SaaS (Eswatini) — multi-tenant core schema.
--
-- Tables: tenants, tenant_settings, profiles, memberships, invites, audit_log
-- RPCs:   register_association, accept_invite, preview_invite
-- Also:   custom access token hook (tenant_roles / is_mega_admin claims),
--         audit trigger, new-user profile trigger, tenant-logos storage bucket.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.member_role as enum (
  'chairman', 'treasurer', 'secretary', 'supervisor', 'member', 'accountant'
);

-- Roles eligible for onboarding "invite your committee" + term-date tracking.
-- (Assumption: committee = chairman/treasurer/secretary; supervisor/member/
-- accountant are operational roles invited later from the Team page.)
create type public.committee_role as enum ('chairman', 'treasurer', 'secretary');

create type public.membership_status as enum ('active', 'revoked', 'expired');

create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create type public.mill_name as enum ('ubombo', 'mhlume', 'simunye', 'other');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  mill public.mill_name not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  season_start date,
  season_end date,
  vat_registered boolean not null default false,
  logo_path text,
  currency text not null default 'SZL' check (currency = 'SZL'),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  is_mega_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  status public.membership_status not null default 'active',
  term_start date,
  term_end date,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  name text not null,
  phone text,
  email text,
  role public.member_role not null,
  term_start date,
  term_end date,
  status public.invite_status not null default 'pending',
  invited_by uuid references auth.users (id),
  accepted_by uuid references auth.users (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  constraint invites_contact_required check (phone is not null or email is not null)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index memberships_tenant_id_idx on public.memberships (tenant_id);
create index memberships_user_id_idx on public.memberships (user_id);
create index invites_tenant_id_idx on public.invites (tenant_id);
create index invites_token_idx on public.invites (token);
create index audit_log_tenant_id_created_at_idx on public.audit_log (tenant_id, created_at desc);

-- ============================================================================
-- 3. JWT claim helpers (read tenant_roles / is_mega_admin from the session JWT)
-- ============================================================================

create or replace function public.jwt_tenant_roles()
returns jsonb
language sql stable
as $$
  select coalesce(auth.jwt() -> 'tenant_roles', '{}'::jsonb);
$$;

create or replace function public.jwt_is_mega_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() ->> 'is_mega_admin')::boolean, false);
$$;

create or replace function public.jwt_is_member(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_is_mega_admin() or (public.jwt_tenant_roles() ? p_tenant_id::text);
$$;

create or replace function public.jwt_has_role(p_tenant_id uuid, p_roles public.member_role[])
returns boolean
language sql stable
as $$
  select public.jwt_is_mega_admin() or exists (
    select 1
    from jsonb_array_elements_text(public.jwt_tenant_roles() -> p_tenant_id::text) as r(value)
    where r.value = any (p_roles::text[])
  );
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.tenants enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.audit_log enable row level security;

-- tenants: readable by members, editable by chairman/secretary.
-- No insert/delete policy — creation only happens via register_association().
create policy tenants_select on public.tenants
  for select using (public.jwt_is_member(id));

create policy tenants_update on public.tenants
  for update using (public.jwt_has_role(id, array['chairman', 'secretary']::public.member_role[]))
  with check (public.jwt_has_role(id, array['chairman', 'secretary']::public.member_role[]));

-- tenant_settings: same read/write shape as tenants.
create policy tenant_settings_select on public.tenant_settings
  for select using (public.jwt_is_member(tenant_id));

create policy tenant_settings_update on public.tenant_settings
  for update using (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]))
  with check (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

-- profiles: everyone can read their own profile, plus profiles of people who
-- share at least one active tenant membership with them. Self-update only.
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.memberships mine
      join public.memberships theirs on theirs.tenant_id = mine.tenant_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- memberships: members can read their tenant's roster; only chairman/secretary
-- can mutate rows (role changes, term dates, revoke). Creation happens via
-- register_association() / accept_invite(), not direct insert.
create policy memberships_select on public.memberships
  for select using (public.jwt_is_member(tenant_id));

create policy memberships_update on public.memberships
  for update using (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]))
  with check (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

-- invites: chairman/secretary only, in both directions. Unauthenticated
-- lookups go through preview_invite()/accept_invite(), never the table directly.
create policy invites_select on public.invites
  for select using (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

create policy invites_insert on public.invites
  for insert with check (
    public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[])
    and invited_by = auth.uid()
  );

create policy invites_delete on public.invites
  for delete using (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

-- audit_log: committee + accountant can read; all writes come from the audit
-- trigger (SECURITY DEFINER, owned by postgres, bypasses RLS) — no direct
-- insert/update/delete policy is granted to app roles.
create policy audit_log_select on public.audit_log
  for select using (
    public.jwt_has_role(tenant_id, array['chairman', 'treasurer', 'secretary', 'accountant']::public.member_role[])
  );

-- ============================================================================
-- 5. New-user profile bootstrap
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 6. Audit trigger (generic before/after capture)
-- ============================================================================

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_entity_id text;
  v_row jsonb;
begin
  v_row := to_jsonb(coalesce(new, old));
  v_entity_id := coalesce(v_row ->> 'id', v_row ->> 'tenant_id');
  v_tenant_id := case
    when v_row ? 'tenant_id' then (v_row ->> 'tenant_id')::uuid
    when TG_TABLE_NAME = 'tenants' then (v_row ->> 'id')::uuid
    else null
  end;

  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, before, after)
  values (
    v_tenant_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_tenants
  after insert or update or delete on public.tenants
  for each row execute function public.audit_row_change();

create trigger audit_tenant_settings
  after insert or update or delete on public.tenant_settings
  for each row execute function public.audit_row_change();

create trigger audit_memberships
  after insert or update or delete on public.memberships
  for each row execute function public.audit_row_change();

create trigger audit_invites
  after insert or update or delete on public.invites
  for each row execute function public.audit_row_change();

-- ============================================================================
-- 7. Custom access token hook — tenant_roles / is_mega_admin claims
--
-- NOTE: writing this function is not enough by itself — it must also be
-- wired up in Supabase Dashboard → Authentication → Hooks → "Customize
-- Access Token (JWT) Claims hook", pointed at public.custom_access_token_hook.
-- ============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_user_id uuid := (event ->> 'user_id')::uuid;
  v_tenant_roles jsonb;
  v_is_mega_admin boolean;
  v_claims jsonb;
begin
  select coalesce(jsonb_object_agg(tenant_id, roles), '{}'::jsonb)
  into v_tenant_roles
  from (
    select tenant_id::text as tenant_id, jsonb_agg(role) as roles
    from public.memberships
    where user_id = v_user_id and status = 'active'
    group by tenant_id
  ) grouped;

  select coalesce(is_mega_admin, false)
  into v_is_mega_admin
  from public.profiles
  where id = v_user_id;

  v_claims := event -> 'claims';
  v_claims := jsonb_set(v_claims, '{tenant_roles}', coalesce(v_tenant_roles, '{}'::jsonb));
  v_claims := jsonb_set(v_claims, '{is_mega_admin}', to_jsonb(coalesce(v_is_mega_admin, false)));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant select on public.memberships, public.profiles to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

create policy memberships_auth_admin_select on public.memberships
  for select to supabase_auth_admin using (true);

create policy profiles_auth_admin_select on public.profiles
  for select to supabase_auth_admin using (true);

-- ============================================================================
-- 8. RPCs — register_association / accept_invite / preview_invite
-- ============================================================================

create or replace function public.register_association(p_name text, p_slug text, p_mill public.mill_name)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create an association';
  end if;

  insert into public.tenants (name, slug, mill)
  values (p_name, p_slug, p_mill)
  returning id into v_tenant_id;

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id);

  insert into public.memberships (tenant_id, user_id, role, status)
  values (v_tenant_id, auth.uid(), 'chairman', 'active');

  return v_tenant_id;
end;
$$;

grant execute on function public.register_association(text, text, public.mill_name) to authenticated;

create or replace function public.accept_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_tenant public.tenants%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invite';
  end if;

  select * into v_invite
  from public.invites
  where token = p_token and status = 'pending' and expires_at > now()
  for update;

  if not found then
    raise exception 'This invite is no longer valid';
  end if;

  select * into v_tenant from public.tenants where id = v_invite.tenant_id;

  insert into public.memberships (tenant_id, user_id, role, status, term_start, term_end)
  values (v_invite.tenant_id, auth.uid(), v_invite.role, 'active', v_invite.term_start, v_invite.term_end)
  on conflict (tenant_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      term_start = excluded.term_start,
      term_end = excluded.term_end,
      updated_at = now();

  update public.invites
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'tenant_id', v_tenant.id,
    'tenant_name', v_tenant.name,
    'role', v_invite.role
  );
end;
$$;

grant execute on function public.accept_invite(uuid) to authenticated;

create or replace function public.preview_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_tenant_name text;
begin
  select * into v_invite from public.invites where token = p_token;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  select name into v_tenant_name from public.tenants where id = v_invite.tenant_id;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('valid', false, 'reason', v_invite.status::text, 'tenant_name', v_tenant_name);
  end if;

  if v_invite.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'expired', 'tenant_name', v_tenant_name);
  end if;

  return jsonb_build_object(
    'valid', true,
    'tenant_name', v_tenant_name,
    'name', v_invite.name,
    'role', v_invite.role,
    'expires_at', v_invite.expires_at
  );
end;
$$;

grant execute on function public.preview_invite(uuid) to anon, authenticated;

-- ============================================================================
-- 9. Storage — tenant-logos bucket ({tenantId}/logo path)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('tenant-logos', 'tenant-logos', true)
on conflict (id) do nothing;

create policy "tenant-logos public read" on storage.objects
  for select using (bucket_id = 'tenant-logos');

create policy "tenant-logos committee write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'tenant-logos'
    and public.jwt_has_role(((storage.foldername(name))[1])::uuid, array['chairman', 'secretary']::public.member_role[])
  );

create policy "tenant-logos committee update" on storage.objects
  for update to authenticated using (
    bucket_id = 'tenant-logos'
    and public.jwt_has_role(((storage.foldername(name))[1])::uuid, array['chairman', 'secretary']::public.member_role[])
  );
