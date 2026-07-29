-- Reconciling the auth-experience branch's invite-acceptance UI with the
-- Module A/B schema: accepting an invite needs to sign the visitor up with
-- the contact info the invite was sent to (Supabase Auth needs a phone or
-- email to create the account), but preview_invite() didn't return either.

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
    'phone', v_invite.phone,
    'email', v_invite.email,
    'expires_at', v_invite.expires_at
  );
end;
$$;
