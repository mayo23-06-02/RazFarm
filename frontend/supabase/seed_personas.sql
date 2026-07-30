-- Seeds the six test personas documented in persona.md, pre-confirmed so they
-- can sign in immediately (no SMS/email OTP step).
--
-- Run this in the Supabase SQL editor as postgres. It inserts directly into
-- auth.users / auth.identities, which app roles can't do — this is the
-- SQL-editor equivalent of Dashboard → Authentication → Users → "Add user"
-- for each persona, plus wiring up the public.memberships row that
-- register_association()/accept_invite() would normally create.
--
-- Idempotent: safe to re-run. Reuses the "RazFarm Test Co-op" tenant and any
-- persona emails that already exist in auth.users instead of erroring, and
-- upserts each membership row. The trailing select lists every persona email
-- currently seeded, so you can see what's already there before re-running.

create extension if not exists pgcrypto;

do $$
declare
  v_tenant_id uuid;
  v_persona record;
  v_user_id uuid;
  v_personas jsonb := '[
    {"role": "chairman",   "full_name": "Test Chairman",   "email": "test.chairman@canandledger.test",   "password": "Test@Chairman123"},
    {"role": "treasurer",  "full_name": "Test Treasurer",  "email": "test.treasurer@canandledger.test",  "password": "Test@Treasurer123"},
    {"role": "secretary",  "full_name": "Test Secretary",  "email": "test.secretary@canandledger.test",  "password": "Test@Secretary123"},
    {"role": "supervisor", "full_name": "Test Supervisor", "email": "test.supervisor@canandledger.test", "password": "Test@Supervisor123"},
    {"role": "accountant", "full_name": "Test Accountant", "email": "test.accountant@canandledger.test", "password": "Test@Accountant123"},
    {"role": "member",     "full_name": "Test Member",     "email": "test.member@canandledger.test",     "password": "Test@Member123"}
  ]'::jsonb;
begin
  -- 1. Tenant (reuse if it already exists) -----------------------------------
  select id into v_tenant_id from public.tenants where slug = 'razfarm-test-coop';

  if v_tenant_id is null then
    insert into public.tenants (name, slug, mill)
    values ('RazFarm Test Co-op', 'razfarm-test-coop', 'other')
    returning id into v_tenant_id;

    insert into public.tenant_settings (tenant_id)
    values (v_tenant_id);
  end if;

  -- 2. One auth user + membership per persona (reuse existing users) --------
  for v_persona in select * from jsonb_to_recordset(v_personas) as x(role text, full_name text, email text, password text)
  loop
    select id into v_user_id from auth.users where email = v_persona.email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated', v_persona.email,
        crypt(v_persona.password, gen_salt('bf')),
        now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_persona.full_name),
        now(), now(),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_user_id, v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', v_persona.email),
        'email', now(), now(), now()
      );

      -- public.profiles row is created automatically by the on_auth_user_created
      -- trigger (0001 §5) — no explicit insert needed here.
    else
      raise notice '% already exists — reusing user %', v_persona.email, v_user_id;
    end if;

    insert into public.memberships (tenant_id, user_id, role, status)
    values (v_tenant_id, v_user_id, v_persona.role::public.member_role, 'active')
    on conflict (tenant_id, user_id) do update
    set role = excluded.role, status = 'active', updated_at = now();
  end loop;

  raise notice 'Seeded personas under tenant % (RazFarm Test Co-op)', v_tenant_id;
end $$;

-- Shows every persona email currently seeded, so you can confirm what
-- exists before deciding whether to re-run.
select email, id, created_at
from auth.users
where email like 'test.%@canandledger.test'
order by email;
