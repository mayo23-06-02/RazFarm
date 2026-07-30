-- Seeds the six test personas documented in persona.md, pre-confirmed so they
-- can sign in immediately (no SMS/email OTP step).
--
-- Run this in the Supabase SQL editor as postgres. It inserts directly into
-- auth.users / auth.identities, which app roles can't do — this is the
-- SQL-editor equivalent of Dashboard → Authentication → Users → "Add user"
-- for each persona, plus wiring up the public.memberships row that
-- register_association()/accept_invite() would normally create.
--
-- Creates a dedicated tenant ("RazFarm Test Co-op") so it doesn't collide
-- with any real association's data. Safe to run once; re-running fails on
-- the tenants.slug / auth.users.email unique constraints rather than
-- silently duplicating rows.

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
  -- 1. Tenant ---------------------------------------------------------------
  insert into public.tenants (name, slug, mill)
  values ('RazFarm Test Co-op', 'razfarm-test-coop', 'other')
  returning id into v_tenant_id;

  insert into public.tenant_settings (tenant_id)
  values (v_tenant_id);

  -- 2. One auth user + membership per persona --------------------------------
  for v_persona in select * from jsonb_to_recordset(v_personas) as x(role text, full_name text, email text, password text)
  loop
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

    insert into public.memberships (tenant_id, user_id, role, status)
    values (v_tenant_id, v_user_id, v_persona.role::public.member_role, 'active');
  end loop;

  raise notice 'Seeded 6 personas under tenant % (RazFarm Test Co-op)', v_tenant_id;
end $$;
