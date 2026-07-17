-- SavePixie core Savings Pacts.
--
-- Customer savings remain at an external bank. Browser clients may record only
-- commitments and manual pending saves. A future regulated provider (through
-- the service role) may append verified allocations after checking the linked
-- Savings Home. The ledger is append-only and trigger-maintained totals are
-- projections, never an independently writable source of truth.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.savings_homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 64),
  provider_name text check (provider_name is null or char_length(provider_name) <= 80),
  account_hint text check (account_hint is null or char_length(account_hint) <= 24),
  connection_status text not null default 'manual'
    check (connection_status in ('manual', 'connected', 'consent_expired', 'disconnected')),
  reported_balance_cents bigint check (reported_balance_cents is null or reported_balance_cents >= 0),
  verified_balance_cents bigint check (verified_balance_cents is null or verified_balance_cents >= 0),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (
    (connection_status = 'connected' and verified_balance_cents is not null and last_verified_at is not null)
    or connection_status <> 'connected'
  )
);

create table public.savings_pacts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('solo', 'shared')),
  name text not null check (char_length(name) between 1 and 64),
  target_cents bigint not null check (target_cents > 0),
  reported_cents bigint not null default 0 check (reported_cents >= 0),
  verified_cents bigint not null default 0 check (verified_cents >= 0),
  emoji text not null default '✨' check (char_length(emoji) between 1 and 16),
  color text not null default '#7b3fff' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  deadline_date date,
  contribution_rule text not null default 'flexible'
    check (contribution_rule in ('flexible', 'equal', 'custom', 'proportional', 'matched')),
  status text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verified_cents <= reported_cents)
);

create table public.savings_pact_members (
  pact_id uuid not null references public.savings_pacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 64),
  commitment_cents bigint check (commitment_cents is null or commitment_cents >= 0),
  privacy_mode text not null default 'on_track_only'
    check (privacy_mode in ('exact', 'on_track_only', 'organizer_only', 'private')),
  joined_at timestamptz not null default now(),
  primary key (pact_id, user_id)
);

create table public.savings_pact_entries (
  id uuid primary key default gen_random_uuid(),
  pact_id uuid not null,
  member_user_id uuid not null,
  savings_home_id uuid,
  entry_type text not null
    check (entry_type in ('commitment', 'pending', 'allocation', 'withdrawal', 'reversal')),
  delta_cents bigint not null check (delta_cents <> 0),
  verification_state text not null default 'unverified'
    check (verification_state in ('unverified', 'verified', 'last_verified')),
  source_entry_id uuid references public.savings_pact_entries(id),
  note text check (note is null or char_length(note) <= 240),
  created_at timestamptz not null default now(),
  foreign key (pact_id, member_user_id)
    references public.savings_pact_members(pact_id, user_id)
    on delete cascade,
  foreign key (savings_home_id, member_user_id)
    references public.savings_homes(id, user_id),
  check (
    (entry_type in ('commitment', 'pending', 'allocation') and delta_cents > 0)
    or (entry_type in ('withdrawal', 'reversal') and delta_cents < 0)
  ),
  check (
    (entry_type = 'commitment' and savings_home_id is null)
    or (entry_type <> 'commitment' and savings_home_id is not null)
  ),
  check (
    (entry_type in ('commitment', 'pending') and verification_state = 'unverified')
    or entry_type not in ('commitment', 'pending')
  )
);

create table private.savings_pact_invites (
  token uuid primary key default gen_random_uuid(),
  pact_id uuid not null references public.savings_pacts(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  remaining_uses integer not null default 10 check (remaining_uses between 0 and 50),
  created_at timestamptz not null default now()
);

create index savings_homes_user_id_idx on public.savings_homes(user_id);
create index savings_pacts_created_by_idx on public.savings_pacts(created_by);
create index savings_pact_members_user_id_idx on public.savings_pact_members(user_id);
create index savings_pact_entries_pact_created_idx
  on public.savings_pact_entries(pact_id, created_at desc);
create index savings_pact_entries_member_created_idx
  on public.savings_pact_entries(member_user_id, created_at desc);
create index savings_pact_entries_home_verified_idx
  on public.savings_pact_entries(savings_home_id, verification_state)
  where savings_home_id is not null;

alter table public.savings_homes enable row level security;
alter table public.savings_pacts enable row level security;
alter table public.savings_pact_members enable row level security;
alter table public.savings_pact_entries enable row level security;

create or replace function private.is_savings_pact_member(
  requested_pact_id uuid,
  requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.savings_pact_members
    where pact_id = requested_pact_id
      and user_id = requested_user_id
  );
$$;

create or replace function private.is_savings_pact_owner(
  requested_pact_id uuid,
  requested_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.savings_pact_members
    where pact_id = requested_pact_id
      and user_id = requested_user_id
      and role = 'owner'
  );
$$;

create or replace function private.can_view_pact_member_amount(
  requested_pact_id uuid,
  subject_user_id uuid,
  viewer_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    subject_user_id = viewer_user_id
    or exists (
      select 1
      from public.savings_pact_members subject
      where subject.pact_id = requested_pact_id
        and subject.user_id = subject_user_id
        and (
          subject.privacy_mode = 'exact'
          or (
            subject.privacy_mode = 'organizer_only'
            and exists (
              select 1
              from public.savings_pact_members viewer
              where viewer.pact_id = requested_pact_id
                and viewer.user_id = viewer_user_id
                and viewer.role = 'owner'
            )
          )
        )
    );
$$;

revoke all on function private.is_savings_pact_member(uuid, uuid) from public, anon;
revoke all on function private.is_savings_pact_owner(uuid, uuid) from public, anon;
revoke all on function private.can_view_pact_member_amount(uuid, uuid, uuid) from public, anon;
grant execute on function private.is_savings_pact_member(uuid, uuid) to authenticated;
grant execute on function private.is_savings_pact_owner(uuid, uuid) to authenticated;
grant execute on function private.can_view_pact_member_amount(uuid, uuid, uuid) to authenticated;

create policy savings_homes_select_own
on public.savings_homes for select to authenticated
using ((select auth.uid()) = user_id);

create policy savings_homes_insert_own
on public.savings_homes for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and connection_status = 'manual'
  and verified_balance_cents is null
  and last_verified_at is null
);

create policy savings_homes_update_own_manual_fields
on public.savings_homes for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and connection_status in ('manual', 'disconnected')
  and verified_balance_cents is null
  and last_verified_at is null
);

create policy savings_pacts_select_member
on public.savings_pacts for select to authenticated
using (
  created_by = (select auth.uid())
  or private.is_savings_pact_member(id, (select auth.uid()))
);

create policy savings_pacts_insert_owner
on public.savings_pacts for insert to authenticated
with check ((select auth.uid()) = created_by);

create policy savings_pacts_update_owner
on public.savings_pacts for update to authenticated
using (private.is_savings_pact_owner(id, (select auth.uid())))
with check (
  private.is_savings_pact_owner(id, (select auth.uid()))
  and created_by = (select auth.uid())
);

create policy savings_pact_members_select_member
on public.savings_pact_members for select to authenticated
using (private.is_savings_pact_member(pact_id, (select auth.uid())));

create policy savings_pact_members_insert_initial_owner
on public.savings_pact_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1
    from public.savings_pacts pact
    where pact.id = pact_id
      and pact.created_by = (select auth.uid())
  )
);

create policy savings_pact_members_update_self
on public.savings_pact_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy savings_pact_entries_select_permitted
on public.savings_pact_entries for select to authenticated
using (
  private.is_savings_pact_member(pact_id, (select auth.uid()))
  and private.can_view_pact_member_amount(
    pact_id,
    member_user_id,
    (select auth.uid())
  )
);

create policy savings_pact_entries_insert_manual
on public.savings_pact_entries for insert to authenticated
with check (
  member_user_id = (select auth.uid())
  and entry_type in ('commitment', 'pending')
  and verification_state = 'unverified'
  and private.is_savings_pact_member(pact_id, (select auth.uid()))
);

create or replace function private.apply_savings_pact_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  allocated_to_home bigint;
  verified_home_balance bigint;
begin
  if request_user_id is not null then
    if request_user_id <> new.member_user_id then
      raise exception 'A member can record only their own Pact activity.' using errcode = '42501';
    end if;

    if new.entry_type not in ('commitment', 'pending')
      or new.verification_state <> 'unverified' then
      raise exception 'Only the verification service may confirm Pact money.' using errcode = '42501';
    end if;
  end if;

  if new.entry_type in ('allocation', 'withdrawal', 'reversal')
    and new.verification_state in ('verified', 'last_verified') then
    select verified_balance_cents
      into verified_home_balance
    from public.savings_homes
    where id = new.savings_home_id
      and user_id = new.member_user_id
    for update;

    if not found or verified_home_balance is null then
      raise exception 'The Savings Home has no verified balance.' using errcode = '23514';
    end if;

    select coalesce(sum(delta_cents), 0)
      into allocated_to_home
    from public.savings_pact_entries
    where savings_home_id = new.savings_home_id
      and id <> new.id
      and verification_state in ('verified', 'last_verified')
      and entry_type in ('allocation', 'withdrawal', 'reversal');

    if allocated_to_home + new.delta_cents > verified_home_balance then
      raise exception 'Verified Pact allocations cannot exceed the linked Savings Home balance.'
        using errcode = '23514';
    end if;
  end if;

  if new.entry_type in ('pending', 'allocation', 'withdrawal', 'reversal') then
    update public.savings_pacts
    set reported_cents = reported_cents + new.delta_cents,
        verified_cents = verified_cents + case
          when new.verification_state in ('verified', 'last_verified') then new.delta_cents
          else 0
        end,
        updated_at = now()
    where id = new.pact_id;

    if not found then
      raise exception 'Savings Pact not found.' using errcode = 'P0002';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.apply_savings_pact_entry() from public, anon, authenticated;

create trigger apply_savings_pact_entry_after_insert
after insert on public.savings_pact_entries
for each row execute function private.apply_savings_pact_entry();

create or replace function public.create_savings_pact(
  p_mode text,
  p_name text,
  p_target_cents bigint,
  p_emoji text default '✨',
  p_color text default '#7b3fff',
  p_deadline_date date default null,
  p_contribution_rule text default 'flexible',
  p_privacy_mode text default 'on_track_only'
)
returns public.savings_pacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  member_display_name text;
  created_pact public.savings_pacts;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_mode not in ('solo', 'shared') then
    raise exception 'Pact mode must be solo or shared.' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Saver')
    into member_display_name
  from public.profiles
  where id = request_user_id;

  member_display_name := coalesce(member_display_name, 'Saver');

  insert into public.savings_pacts (
    created_by,
    mode,
    name,
    target_cents,
    emoji,
    color,
    deadline_date,
    contribution_rule
  )
  values (
    request_user_id,
    p_mode,
    trim(p_name),
    p_target_cents,
    p_emoji,
    p_color,
    p_deadline_date,
    p_contribution_rule
  )
  returning * into created_pact;

  insert into public.savings_pact_members (
    pact_id,
    user_id,
    role,
    display_name,
    privacy_mode
  )
  values (
    created_pact.id,
    request_user_id,
    'owner',
    member_display_name,
    p_privacy_mode
  );

  return created_pact;
end;
$$;

create or replace function public.record_pending_pact_save(
  p_pact_id uuid,
  p_savings_home_id uuid,
  p_amount_cents bigint,
  p_note text default null
)
returns public.savings_pacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  updated_pact public.savings_pacts;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Save amount must be greater than zero.' using errcode = '22023';
  end if;

  insert into public.savings_pact_entries (
    pact_id,
    member_user_id,
    savings_home_id,
    entry_type,
    delta_cents,
    verification_state,
    note
  )
  values (
    p_pact_id,
    request_user_id,
    p_savings_home_id,
    'pending',
    p_amount_cents,
    'unverified',
    p_note
  );

  select * into updated_pact
  from public.savings_pacts
  where id = p_pact_id;

  return updated_pact;
end;
$$;

create or replace function private.create_savings_pact_invite(
  requested_pact_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  invite_token uuid;
begin
  if request_user_id is null
    or not private.is_savings_pact_owner(requested_pact_id, request_user_id) then
    raise exception 'Only the Pact owner can create an invitation.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.savings_pacts
    where id = requested_pact_id and mode = 'shared' and status = 'active'
  ) then
    raise exception 'Only an active shared Pact can be invited to.' using errcode = '22023';
  end if;

  insert into private.savings_pact_invites (pact_id, created_by)
  values (requested_pact_id, request_user_id)
  returning token into invite_token;

  return invite_token;
end;
$$;

create or replace function public.create_savings_pact_invite(
  p_pact_id uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_savings_pact_invite(p_pact_id);
$$;

create or replace function private.join_savings_pact(invite_token uuid)
returns public.savings_pacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  invite_row private.savings_pact_invites;
  member_display_name text;
  joined_pact public.savings_pacts;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into invite_row
  from private.savings_pact_invites
  where token = invite_token
  for update;

  if not found or invite_row.expires_at <= now() or invite_row.remaining_uses <= 0 then
    raise exception 'This Pact invitation is invalid or has expired.' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Saver')
    into member_display_name
  from public.profiles
  where id = request_user_id;

  member_display_name := coalesce(member_display_name, 'Saver');

  insert into public.savings_pact_members (
    pact_id,
    user_id,
    role,
    display_name,
    privacy_mode
  )
  values (
    invite_row.pact_id,
    request_user_id,
    'member',
    member_display_name,
    'on_track_only'
  )
  on conflict (pact_id, user_id) do nothing;

  if found then
    update private.savings_pact_invites
    set remaining_uses = remaining_uses - 1
    where token = invite_token;
  end if;

  select * into joined_pact
  from public.savings_pacts
  where id = invite_row.pact_id;

  return joined_pact;
end;
$$;

create or replace function public.join_savings_pact(p_invite_token uuid)
returns public.savings_pacts
language sql
security invoker
set search_path = ''
as $$
  select private.join_savings_pact(p_invite_token);
$$;

revoke all on table
  public.savings_homes,
  public.savings_pacts,
  public.savings_pact_members,
  public.savings_pact_entries
from anon, authenticated;

grant select on table
  public.savings_homes,
  public.savings_pacts,
  public.savings_pact_members,
  public.savings_pact_entries
to authenticated;

grant insert (user_id, label, provider_name, account_hint, reported_balance_cents)
on public.savings_homes to authenticated;
grant update (label, provider_name, account_hint, reported_balance_cents, connection_status, updated_at)
on public.savings_homes to authenticated;

grant insert (created_by, mode, name, target_cents, emoji, color, deadline_date, contribution_rule)
on public.savings_pacts to authenticated;
grant update (name, target_cents, emoji, color, deadline_date, contribution_rule, status, updated_at)
on public.savings_pacts to authenticated;

grant insert (pact_id, user_id, role, display_name, commitment_cents, privacy_mode)
on public.savings_pact_members to authenticated;
grant update (commitment_cents, privacy_mode)
on public.savings_pact_members to authenticated;

grant insert (
  pact_id,
  member_user_id,
  savings_home_id,
  entry_type,
  delta_cents,
  verification_state,
  source_entry_id,
  note
)
on public.savings_pact_entries to authenticated;

grant select, insert, update, delete on table
  public.savings_homes,
  public.savings_pacts,
  public.savings_pact_members,
  public.savings_pact_entries,
  private.savings_pact_invites
to service_role;

revoke all on function public.create_savings_pact(text, text, bigint, text, text, date, text, text)
from public, anon;
revoke all on function public.record_pending_pact_save(uuid, uuid, bigint, text)
from public, anon;
revoke all on function public.create_savings_pact_invite(uuid)
from public, anon;
revoke all on function public.join_savings_pact(uuid)
from public, anon;

grant execute on function public.create_savings_pact(text, text, bigint, text, text, date, text, text)
to authenticated;
grant execute on function public.record_pending_pact_save(uuid, uuid, bigint, text)
to authenticated;
grant execute on function public.create_savings_pact_invite(uuid)
to authenticated;
grant execute on function public.join_savings_pact(uuid)
to authenticated;

revoke all on function private.create_savings_pact_invite(uuid) from public, anon;
revoke all on function private.join_savings_pact(uuid) from public, anon;
grant execute on function private.create_savings_pact_invite(uuid) to authenticated;
grant execute on function private.join_savings_pact(uuid) to authenticated;

notify pgrst, 'reload schema';
