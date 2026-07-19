-- A cheer is intentionally tiny: one private-to-the-system reaction per member
-- and activity. The Circle sees only aggregate encouragement, never a list of
-- who reacted.

create table if not exists public.savings_pact_activity_cheers (
  activity_id uuid not null references public.savings_pact_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index if not exists savings_pact_activity_cheers_user_id_idx
on public.savings_pact_activity_cheers (user_id);

alter table public.savings_pact_activity_cheers enable row level security;

revoke all on table public.savings_pact_activity_cheers from public, anon, authenticated;

create or replace function private.get_savings_pact_activity_cheers(
  requested_pact_id uuid
)
returns table (
  activity_id uuid,
  cheer_count bigint,
  cheered_by_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
begin
  if request_user_id is null
    or not private.is_savings_pact_member(requested_pact_id, request_user_id) then
    raise exception 'Only active Pact members can view Circle cheers.' using errcode = '42501';
  end if;

  return query
  select
    entry.id,
    count(cheer.user_id)::bigint,
    coalesce(bool_or(cheer.user_id = request_user_id), false)
  from public.savings_pact_entries entry
  left join public.savings_pact_activity_cheers cheer
    on cheer.activity_id = entry.id
  where entry.pact_id = requested_pact_id
    and entry.entry_type in ('pending', 'allocation', 'withdrawal', 'reversal')
  group by entry.id;
end;
$$;

create or replace function private.toggle_savings_pact_activity_cheer(
  requested_activity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  activity_pact_id uuid;
  activity_owner_id uuid;
begin
  select entry.pact_id, entry.member_user_id
    into activity_pact_id, activity_owner_id
  from public.savings_pact_entries entry
  where entry.id = requested_activity_id
    and entry.entry_type in ('pending', 'allocation', 'withdrawal', 'reversal');

  if request_user_id is null
    or activity_pact_id is null
    or not private.is_savings_pact_member(activity_pact_id, request_user_id) then
    raise exception 'Only active Pact members can cheer Circle activity.' using errcode = '42501';
  end if;

  if activity_owner_id = request_user_id then
    raise exception 'A member cannot cheer their own activity.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.savings_pact_activity_cheers
    where activity_id = requested_activity_id
      and user_id = request_user_id
  ) then
    delete from public.savings_pact_activity_cheers
    where activity_id = requested_activity_id
      and user_id = request_user_id;
    return false;
  end if;

  insert into public.savings_pact_activity_cheers (activity_id, user_id)
  values (requested_activity_id, request_user_id);
  return true;
end;
$$;

create or replace function public.get_savings_pact_activity_cheers(p_pact_id uuid)
returns table (
  activity_id uuid,
  cheer_count bigint,
  cheered_by_me boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_savings_pact_activity_cheers(p_pact_id);
$$;

create or replace function public.toggle_savings_pact_activity_cheer(p_activity_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.toggle_savings_pact_activity_cheer(p_activity_id);
$$;

revoke all on function private.get_savings_pact_activity_cheers(uuid) from public, anon;
revoke all on function private.toggle_savings_pact_activity_cheer(uuid) from public, anon;
revoke all on function public.get_savings_pact_activity_cheers(uuid) from public, anon;
revoke all on function public.toggle_savings_pact_activity_cheer(uuid) from public, anon;

grant execute on function private.get_savings_pact_activity_cheers(uuid) to authenticated;
grant execute on function private.toggle_savings_pact_activity_cheer(uuid) to authenticated;
grant execute on function public.get_savings_pact_activity_cheers(uuid) to authenticated;
grant execute on function public.toggle_savings_pact_activity_cheer(uuid) to authenticated;
