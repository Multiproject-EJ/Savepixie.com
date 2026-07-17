-- Privacy-safe Pact membership summaries and reversible leaving.
--
-- Direct table reads expose only the caller's membership row. Circle screens
-- use a filtered RPC that reveals exact amounts only when the subject's
-- privacy choice allows that viewer to see them. Leaving preserves the
-- append-only ledger and can be reversed by accepting a fresh valid invite.

alter table public.savings_pact_members
  add column status text not null default 'active'
    check (status in ('active', 'left')),
  add column left_at timestamptz,
  add constraint savings_pact_members_left_state_check check (
    (status = 'active' and left_at is null)
    or (status = 'left' and left_at is not null)
  );

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
      and status = 'active'
  );
$$;

drop policy savings_pact_members_select_member on public.savings_pact_members;

create policy savings_pact_members_select_self
on public.savings_pact_members for select to authenticated
using ((select auth.uid()) = user_id);

drop policy savings_pact_members_update_self on public.savings_pact_members;

create policy savings_pact_members_update_self
on public.savings_pact_members for update to authenticated
using (
  (select auth.uid()) = user_id
  and status = 'active'
)
with check (
  (select auth.uid()) = user_id
  and status = 'active'
  and left_at is null
);

create or replace function private.get_savings_pact_members(
  requested_pact_id uuid
)
returns table (
  pact_id uuid,
  user_id uuid,
  role text,
  display_name text,
  commitment_cents bigint,
  privacy_mode text,
  member_status text,
  joined_at timestamptz,
  left_at timestamptz,
  reported_cents bigint,
  verified_cents bigint,
  amount_visible boolean,
  on_track boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  viewer_is_owner boolean;
begin
  if request_user_id is null
    or not private.is_savings_pact_member(requested_pact_id, request_user_id) then
    raise exception 'Only active Pact members can view the Circle.' using errcode = '42501';
  end if;

  viewer_is_owner := private.is_savings_pact_owner(requested_pact_id, request_user_id);

  return query
  with member_totals as (
    select
      member.pact_id,
      member.user_id,
      member.role,
      member.display_name,
      member.commitment_cents,
      member.privacy_mode,
      member.status,
      member.joined_at,
      member.left_at,
      coalesce(sum(entry.delta_cents), 0)::bigint as member_reported_cents,
      coalesce(
        sum(entry.delta_cents) filter (
          where entry.verification_state in ('verified', 'last_verified')
        ),
        0
      )::bigint as member_verified_cents
    from public.savings_pact_members member
    left join public.savings_pact_entries entry
      on entry.pact_id = member.pact_id
      and entry.member_user_id = member.user_id
      and entry.entry_type in ('pending', 'allocation', 'withdrawal', 'reversal')
    where member.pact_id = requested_pact_id
      and member.status = 'active'
    group by member.pact_id, member.user_id
  ), visibility as (
    select
      member_totals.*,
      (
        member_totals.user_id = request_user_id
        or member_totals.privacy_mode = 'exact'
        or (member_totals.privacy_mode = 'organizer_only' and viewer_is_owner)
      ) as can_see_amount
    from member_totals
  )
  select
    visibility.pact_id,
    visibility.user_id,
    visibility.role,
    visibility.display_name,
    case when visibility.can_see_amount then visibility.commitment_cents else null end,
    visibility.privacy_mode,
    visibility.status,
    visibility.joined_at,
    visibility.left_at,
    case when visibility.can_see_amount then visibility.member_reported_cents else null end,
    case when visibility.can_see_amount then visibility.member_verified_cents else null end,
    visibility.can_see_amount,
    case
      when visibility.commitment_cents is null then null
      when visibility.can_see_amount or visibility.privacy_mode = 'on_track_only'
        then visibility.member_reported_cents >= visibility.commitment_cents
      else null
    end
  from visibility
  order by
    case when visibility.role = 'owner' then 0 else 1 end,
    visibility.joined_at;
end;
$$;

create or replace function public.get_savings_pact_members(p_pact_id uuid)
returns table (
  pact_id uuid,
  user_id uuid,
  role text,
  display_name text,
  commitment_cents bigint,
  privacy_mode text,
  member_status text,
  joined_at timestamptz,
  left_at timestamptz,
  reported_cents bigint,
  verified_cents bigint,
  amount_visible boolean,
  on_track boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_savings_pact_members(p_pact_id);
$$;

create or replace function private.leave_savings_pact(requested_pact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  member_role text;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select role into member_role
  from public.savings_pact_members
  where pact_id = requested_pact_id
    and user_id = request_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active Pact membership not found.' using errcode = 'P0002';
  end if;

  if member_role = 'owner' then
    raise exception 'The Pact owner must archive the Pact instead of leaving it.'
      using errcode = '22023';
  end if;

  update public.savings_pact_members
  set status = 'left',
      left_at = now()
  where pact_id = requested_pact_id
    and user_id = request_user_id;
end;
$$;

create or replace function public.leave_savings_pact(p_pact_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.leave_savings_pact(p_pact_id);
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
  on conflict (pact_id, user_id) do update
  set display_name = excluded.display_name,
      privacy_mode = 'on_track_only',
      status = 'active',
      left_at = null
  where savings_pact_members.status = 'left';

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

revoke all on function private.get_savings_pact_members(uuid) from public, anon;
revoke all on function public.get_savings_pact_members(uuid) from public, anon;
revoke all on function private.leave_savings_pact(uuid) from public, anon;
revoke all on function public.leave_savings_pact(uuid) from public, anon;

grant execute on function private.get_savings_pact_members(uuid) to authenticated;
grant execute on function public.get_savings_pact_members(uuid) to authenticated;
grant execute on function private.leave_savings_pact(uuid) to authenticated;
grant execute on function public.leave_savings_pact(uuid) to authenticated;

notify pgrst, 'reload schema';
