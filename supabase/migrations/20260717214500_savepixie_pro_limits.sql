-- SavePixie Basic keeps the complete solo saving loop and one two-person shared
-- Pact. Pro unlocks additional shared Pacts and larger family/group circles.
-- Limits apply only when creating or joining; an existing Pact is never removed
-- or hidden when a trial or subscription ends.

create or replace function private.has_savepixie_pro(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select entitlement.has_pro_access
    from public.entitlements entitlement
    where entitlement.user_id = requested_user_id
      and entitlement.product_key = 'savepixie'
  ), false);
$$;

create or replace function private.enforce_savepixie_shared_pact_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  active_shared_pacts integer;
begin
  if request_user_id is null
    or new.mode <> 'shared'
    or private.has_savepixie_pro(request_user_id) then
    return new;
  end if;

  select count(*)::integer
    into active_shared_pacts
  from public.savings_pact_members member
  join public.savings_pacts pact on pact.id = member.pact_id
  where member.user_id = request_user_id
    and member.status = 'active'
    and pact.mode = 'shared'
    and pact.status = 'active';

  if active_shared_pacts >= 1 then
    raise exception 'Basic includes one active shared Pact. SavePixie Pro unlocks more Circles.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

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

  if pact_mode <> 'shared'
    or pact_owner_id is null
    or private.has_savepixie_pro(pact_owner_id) then
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

revoke all on function private.has_savepixie_pro(uuid) from public, anon, authenticated;
revoke all on function private.enforce_savepixie_shared_pact_limit()
from public, anon, authenticated;
revoke all on function private.enforce_savepixie_circle_size()
from public, anon, authenticated;

create trigger enforce_savepixie_shared_pact_limit_before_insert
before insert on public.savings_pacts
for each row execute function private.enforce_savepixie_shared_pact_limit();

create trigger enforce_savepixie_circle_size_before_write
before insert or update of status, role on public.savings_pact_members
for each row execute function private.enforce_savepixie_circle_size();
