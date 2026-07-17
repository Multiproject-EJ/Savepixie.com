-- Apply the one-Circle Basic allowance consistently to Pact members as well as
-- Pact creators. A Pro Circle can be large, but a Basic saver still participates
-- in one active shared Pact unless they upgrade their own account.

create or replace function private.enforce_savepixie_circle_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pact_owner_id uuid;
  pact_mode text;
  active_members integer;
  member_shared_pacts integer;
begin
  if new.status <> 'active'
    or new.role = 'owner'
    or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  select pact.created_by, pact.mode
    into pact_owner_id, pact_mode
  from public.savings_pacts pact
  where pact.id = new.pact_id;

  if pact_mode <> 'shared' or pact_owner_id is null then
    return new;
  end if;

  if not private.has_savepixie_pro(new.user_id) then
    select count(*)::integer
      into member_shared_pacts
    from public.savings_pact_members member
    join public.savings_pacts pact on pact.id = member.pact_id
    where member.user_id = new.user_id
      and member.pact_id <> new.pact_id
      and member.status = 'active'
      and pact.mode = 'shared'
      and pact.status = 'active';

    if member_shared_pacts >= 1 then
      raise exception 'Basic includes one active shared Pact. SavePixie Pro unlocks more Circles.'
        using errcode = 'P0001';
    end if;
  end if;

  if private.has_savepixie_pro(pact_owner_id) then
    return new;
  end if;

  select count(*)::integer
    into active_members
  from public.savings_pact_members member
  where member.pact_id = new.pact_id
    and member.status = 'active'
    and member.user_id <> new.user_id;

  if active_members >= 2 then
    raise exception 'This Basic Circle already has two savers. Its owner needs Pro for a larger group.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_savepixie_circle_size()
from public, anon, authenticated;
