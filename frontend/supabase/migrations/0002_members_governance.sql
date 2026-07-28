-- Module B: Members, Meetings & Governance
-- Sugarcane grower association SaaS (Eswatini).
--
-- Tables: members, invites.member_id (alter), meetings, agenda_items,
--         attendance, resolutions, minutes, announcements, documents
-- Also:   accept_invite() extended to link members.user_id on acceptance,
--         tenant-docs storage bucket.
--
-- Critical concept: `members` is the grower register (one row per grower,
-- login or not). `memberships` (see 0001) is who can log in and with what
-- role. members.user_id links a register row to an account when one exists
-- — most growers have a register row and no login.

-- ============================================================================
-- 1. Enums
-- ============================================================================

create type public.member_status as enum ('active', 'suspended', 'exited');
create type public.meeting_type as enum ('agm', 'committee', 'special');
create type public.meeting_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'apologies', 'absent');
create type public.resolution_outcome as enum ('passed', 'failed');
create type public.minutes_status as enum ('draft', 'submitted', 'approved');
create type public.announcement_audience as enum ('all', 'committee', 'custom');
create type public.document_category as enum ('constitution', 'agreements', 'policies', 'titles', 'general');

-- ============================================================================
-- 2. Tables
-- ============================================================================

create table public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  member_no text not null check (char_length(member_no) between 1 and 20),
  full_name text not null check (char_length(full_name) between 2 and 120),
  national_id text,
  phone text,
  email text,
  join_date date not null default current_date,
  shareholding numeric(12, 2) not null default 0 check (shareholding >= 0),
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_relationship text,
  notes text,
  status public.member_status not null default 'active',
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, member_no)
);

-- One invite may target a register row (invite.member_id) so acceptance can
-- link members.user_id back to the account that accepted it.
alter table public.invites add column member_id uuid references public.members (id) on delete set null;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type public.meeting_type not null,
  title text not null check (char_length(title) between 2 and 160),
  starts_at timestamptz not null,
  venue text,
  status public.meeting_status not null default 'scheduled',
  notify boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  position integer not null default 0,
  item text not null check (char_length(item) between 1 and 200),
  presenter text,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status public.attendance_status not null default 'absent',
  recorded_by uuid references auth.users (id),
  recorded_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create table public.resolutions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  ref_no text not null,
  title text not null check (char_length(title) between 2 and 200),
  body text,
  moved_by uuid references public.members (id),
  seconded_by uuid references public.members (id),
  votes_for integer not null default 0 check (votes_for >= 0),
  votes_against integer not null default 0 check (votes_against >= 0),
  votes_abstain integer not null default 0 check (votes_abstain >= 0),
  outcome public.resolution_outcome,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, ref_no)
);

create table public.minutes (
  meeting_id uuid primary key references public.meetings (id) on delete cascade,
  body_markdown text not null default '',
  status public.minutes_status not null default 'draft',
  submitted_by uuid references auth.users (id),
  submitted_at timestamptz,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  body text not null,
  audience public.announcement_audience not null default 'all',
  custom_member_ids uuid[],
  send_sms boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  category public.document_category not null default 'general',
  name text not null,
  path text not null,
  size bigint not null default 0,
  mime_type text,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index members_tenant_id_idx on public.members (tenant_id);
create index members_user_id_idx on public.members (user_id);
create index meetings_tenant_id_idx on public.meetings (tenant_id);
create index agenda_items_meeting_id_idx on public.agenda_items (meeting_id, position);
create index attendance_meeting_id_idx on public.attendance (meeting_id);
create index attendance_member_id_idx on public.attendance (member_id);
create index resolutions_meeting_id_idx on public.resolutions (meeting_id);
create index announcements_tenant_id_idx on public.announcements (tenant_id, published_at desc);
create index documents_tenant_id_idx on public.documents (tenant_id, category);

-- ============================================================================
-- 3. Role-group helper
--
-- REGISTER_VIEWERS: everyone except plain 'member' — chairman, secretary,
-- treasurer, supervisor, accountant. Plain members only see their own
-- register row (enforced per-policy below, not via this helper).
-- COMMITTEE: chairman, secretary, treasurer (matches public.committee_role).
-- ATTENDANCE_RECORDERS: committee + supervisor.
-- ============================================================================

create or replace function public.jwt_is_register_viewer(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(
    p_tenant_id,
    array['chairman', 'secretary', 'treasurer', 'supervisor', 'accountant']::public.member_role[]
  );
$$;

create or replace function public.jwt_is_committee(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(p_tenant_id, array['chairman', 'secretary', 'treasurer']::public.member_role[]);
$$;

create or replace function public.jwt_can_record_attendance(p_tenant_id uuid)
returns boolean
language sql stable
as $$
  select public.jwt_has_role(
    p_tenant_id,
    array['chairman', 'secretary', 'treasurer', 'supervisor']::public.member_role[]
  );
$$;

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.members enable row level security;
alter table public.meetings enable row level security;
alter table public.agenda_items enable row level security;
alter table public.attendance enable row level security;
alter table public.resolutions enable row level security;
alter table public.minutes enable row level security;
alter table public.announcements enable row level security;
alter table public.documents enable row level security;

-- members: register viewers see the full roster; plain members see only
-- their own linked row. Only chairman/secretary mutate.
create policy members_select on public.members
  for select using (
    public.jwt_is_register_viewer(tenant_id)
    or user_id = auth.uid()
  );

create policy members_insert on public.members
  for insert with check (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

create policy members_update on public.members
  for update using (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]))
  with check (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

-- meetings / agenda_items: any member reads; chairman/secretary schedule and
-- run the status flow.
create policy meetings_select on public.meetings
  for select using (public.jwt_is_member(tenant_id));

create policy meetings_insert on public.meetings
  for insert with check (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

create policy meetings_update on public.meetings
  for update using (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]))
  with check (public.jwt_has_role(tenant_id, array['chairman', 'secretary']::public.member_role[]));

create policy agenda_items_select on public.agenda_items
  for select using (
    exists (select 1 from public.meetings m where m.id = agenda_items.meeting_id and public.jwt_is_member(m.tenant_id))
  );

create policy agenda_items_write on public.agenda_items
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = agenda_items.meeting_id
        and public.jwt_has_role(m.tenant_id, array['chairman', 'secretary']::public.member_role[])
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = agenda_items.meeting_id
        and public.jwt_has_role(m.tenant_id, array['chairman', 'secretary']::public.member_role[])
    )
  );

-- attendance: any member reads (for live counts); committee + supervisor
-- record it.
create policy attendance_select on public.attendance
  for select using (
    exists (select 1 from public.meetings m where m.id = attendance.meeting_id and public.jwt_is_member(m.tenant_id))
  );

create policy attendance_write on public.attendance
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = attendance.meeting_id and public.jwt_can_record_attendance(m.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = attendance.meeting_id and public.jwt_can_record_attendance(m.tenant_id)
    )
  );

-- resolutions: any member reads; committee adds/edits.
create policy resolutions_select on public.resolutions
  for select using (public.jwt_is_member(tenant_id));

create policy resolutions_write on public.resolutions
  for all using (public.jwt_is_committee(tenant_id))
  with check (public.jwt_is_committee(tenant_id));

-- minutes: any member reads; committee drafts/submits; approval is gated to
-- chairman in the app layer (RLS allows any committee update so treasurer/
-- secretary can still fix typos pre-approval).
create policy minutes_select on public.minutes
  for select using (
    exists (select 1 from public.meetings m where m.id = minutes.meeting_id and public.jwt_is_member(m.tenant_id))
  );

create policy minutes_write on public.minutes
  for all using (
    exists (
      select 1 from public.meetings m
      where m.id = minutes.meeting_id and public.jwt_is_committee(m.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = minutes.meeting_id and public.jwt_is_committee(m.tenant_id)
    )
  );

-- announcements: published ones are visible per audience; drafts are
-- committee-only. Writes are committee-only.
create policy announcements_select on public.announcements
  for select using (
    public.jwt_is_committee(tenant_id)
    or (
      published_at is not null
      and (
        audience = 'all'
        or (audience = 'custom' and exists (
          select 1 from public.members m
          where m.tenant_id = announcements.tenant_id
            and m.user_id = auth.uid()
            and m.id = any (announcements.custom_member_ids)
        ))
      )
      and public.jwt_is_member(tenant_id)
    )
  );

create policy announcements_write on public.announcements
  for all using (public.jwt_is_committee(tenant_id))
  with check (public.jwt_is_committee(tenant_id));

-- documents: any member reads/downloads; committee uploads/deletes.
create policy documents_select on public.documents
  for select using (public.jwt_is_member(tenant_id));

create policy documents_write on public.documents
  for all using (public.jwt_is_committee(tenant_id))
  with check (public.jwt_is_committee(tenant_id));

-- ============================================================================
-- 5. Audit triggers (reuses public.audit_row_change from 0001) and a shared
--    updated_at helper (0001 tables set it manually; new tables use this).
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger audit_members
  after insert or update or delete on public.members
  for each row execute function public.audit_row_change();

create trigger audit_meetings
  after insert or update or delete on public.meetings
  for each row execute function public.audit_row_change();

create trigger audit_resolutions
  after insert or update or delete on public.resolutions
  for each row execute function public.audit_row_change();

create trigger audit_announcements
  after insert or update or delete on public.announcements
  for each row execute function public.audit_row_change();

create trigger set_members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. accept_invite() — extend to link members.user_id when the invite
--    carries a member_id (register row invited to get app access).
-- ============================================================================

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

  if v_invite.member_id is not null then
    update public.members
    set user_id = auth.uid(), updated_at = now()
    where id = v_invite.member_id and tenant_id = v_invite.tenant_id;
  end if;

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

create trigger set_meetings_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

create trigger set_resolutions_updated_at
  before update on public.resolutions
  for each row execute function public.set_updated_at();

create trigger set_minutes_updated_at
  before update on public.minutes
  for each row execute function public.set_updated_at();

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 7. Storage — tenant-docs bucket ({tenantId}/{category}/{uuid}-{filename})
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('tenant-docs', 'tenant-docs', false)
on conflict (id) do nothing;

create policy "tenant-docs member read" on storage.objects
  for select to authenticated using (
    bucket_id = 'tenant-docs'
    and public.jwt_is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "tenant-docs committee write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'tenant-docs'
    and public.jwt_is_committee(((storage.foldername(name))[1])::uuid)
  );

create policy "tenant-docs committee delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'tenant-docs'
    and public.jwt_is_committee(((storage.foldername(name))[1])::uuid)
  );
