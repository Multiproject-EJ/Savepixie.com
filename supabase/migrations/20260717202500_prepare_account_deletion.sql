-- Preserve the integrity of shared Pacts when a member deletes their account.
-- The Auth user deletion still cascades all data belonging to that person. Before
-- it runs, this service-only function hands an owned shared Pact to the oldest
-- active remaining member and removes the departing member's contribution from
-- the Pact projections. Solo Pacts and shared Pacts with nobody left disappear
-- with their owner as expected.

create or replace function public.prepare_savepixie_account_deletion(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_pact record;
  successor_user_id uuid;
  transferred_pacts integer := 0;
begin
  if p_user_id is null then
    raise exception 'A user id is required.' using errcode = '22023';
  end if;

  for owned_pact in
    select pact.id
    from public.savings_pacts pact
    where pact.created_by = p_user_id
      and pact.mode = 'shared'
    order by pact.created_at, pact.id
    for update
  loop
    select member.user_id
      into successor_user_id
    from public.savings_pact_members member
    where member.pact_id = owned_pact.id
      and member.user_id <> p_user_id
      and member.status = 'active'
    order by member.joined_at, member.user_id
    limit 1
    for update;

    if successor_user_id is not null then
      update public.savings_pact_members
      set role = 'member'
      where pact_id = owned_pact.id
        and user_id = p_user_id;

      update public.savings_pact_members
      set role = 'owner'
      where pact_id = owned_pact.id
        and user_id = successor_user_id;

      update public.savings_pacts
      set created_by = successor_user_id,
          updated_at = now()
      where id = owned_pact.id;

      transferred_pacts := transferred_pacts + 1;
    end if;

    successor_user_id := null;
  end loop;

  -- Entries owned by the deleting user will cascade with their membership.
  -- Recalculate every shared Pact that will remain so its projections already
  -- match the post-deletion ledger.
  update public.savings_pacts pact
  set reported_cents = totals.reported_cents,
      verified_cents = totals.verified_cents,
      updated_at = now()
  from (
    select
      member.pact_id,
      coalesce(
        sum(entry.delta_cents) filter (
          where entry.member_user_id <> p_user_id
            and entry.entry_type in ('pending', 'allocation', 'withdrawal', 'reversal')
        ),
        0
      )::bigint as reported_cents,
      coalesce(
        sum(entry.delta_cents) filter (
          where entry.member_user_id <> p_user_id
            and entry.entry_type in ('allocation', 'withdrawal', 'reversal')
            and entry.verification_state in ('verified', 'last_verified')
        ),
        0
      )::bigint as verified_cents
    from public.savings_pact_members member
    left join public.savings_pact_entries entry
      on entry.pact_id = member.pact_id
    join public.savings_pacts remaining_pact
      on remaining_pact.id = member.pact_id
      and remaining_pact.mode = 'shared'
      and remaining_pact.created_by <> p_user_id
    where member.user_id = p_user_id
    group by member.pact_id
  ) totals
  where pact.id = totals.pact_id;

  return transferred_pacts;
end;
$$;

revoke all on function public.prepare_savepixie_account_deletion(uuid)
from public, anon, authenticated;

grant execute on function public.prepare_savepixie_account_deletion(uuid)
to service_role;

notify pgrst, 'reload schema';
