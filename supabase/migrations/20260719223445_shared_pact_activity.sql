-- A shared Pact needs social proof without turning private savings into a
-- leaderboard. This feed exposes that a member contributed, but returns the
-- exact amount only when the member's existing privacy choice allows it.

create or replace function private.get_savings_pact_activity(
  requested_pact_id uuid,
  requested_limit integer default 20
)
returns table (
  activity_id uuid,
  actor_user_id uuid,
  actor_display_name text,
  activity_kind text,
  amount_cents bigint,
  amount_visible boolean,
  occurred_at timestamptz
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
    raise exception 'Only active Pact members can view Circle activity.' using errcode = '42501';
  end if;

  return query
  select
    entry.id,
    member.user_id,
    member.display_name,
    case
      when entry.entry_type = 'allocation' then 'verified_save'
      when entry.entry_type in ('withdrawal', 'reversal') then 'adjustment'
      else 'save'
    end,
    case
      when private.can_view_pact_member_amount(
        requested_pact_id,
        member.user_id,
        request_user_id
      ) then entry.delta_cents
      else null
    end,
    private.can_view_pact_member_amount(
      requested_pact_id,
      member.user_id,
      request_user_id
    ),
    entry.created_at
  from public.savings_pact_entries entry
  join public.savings_pact_members member
    on member.pact_id = entry.pact_id
    and member.user_id = entry.member_user_id
  where entry.pact_id = requested_pact_id
    and member.status = 'active'
    and entry.entry_type in ('pending', 'allocation', 'withdrawal', 'reversal')
  order by entry.created_at desc, entry.id desc
  limit least(greatest(coalesce(requested_limit, 20), 1), 50);
end;
$$;

create or replace function public.get_savings_pact_activity(
  p_pact_id uuid,
  p_limit integer default 20
)
returns table (
  activity_id uuid,
  actor_user_id uuid,
  actor_display_name text,
  activity_kind text,
  amount_cents bigint,
  amount_visible boolean,
  occurred_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_savings_pact_activity(p_pact_id, p_limit);
$$;

revoke all on function private.get_savings_pact_activity(uuid, integer) from public, anon;
revoke all on function public.get_savings_pact_activity(uuid, integer) from public, anon;
grant execute on function private.get_savings_pact_activity(uuid, integer) to authenticated;
grant execute on function public.get_savings_pact_activity(uuid, integer) to authenticated;
