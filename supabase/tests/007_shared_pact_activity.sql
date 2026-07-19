begin;

insert into auth.users (id, email)
values
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'activity-owner@example.invalid'),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'activity-member@example.invalid'),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'activity-outsider@example.invalid');

insert into public.profiles (id, display_name)
values
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Owner'),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Member'),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Outsider');

create temp table pact_activity_test_state (
  pact_id uuid,
  owner_home_id uuid,
  member_home_id uuid
);

grant select on pact_activity_test_state to authenticated;

insert into public.savings_homes (id, user_id, label)
values
  ('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Owner home'),
  ('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Member home');

insert into pact_activity_test_state (owner_home_id, member_home_id)
values (
  'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
);

with pact as (
  insert into public.savings_pacts (created_by, mode, name, target_cents)
  values ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'shared', 'Activity Pact', 100000)
  returning id
)
update pact_activity_test_state set pact_id = pact.id from pact;

insert into public.savings_pact_members (
  pact_id, user_id, role, display_name, privacy_mode
)
select pact_id, 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'owner', 'Owner', 'exact'
from pact_activity_test_state
union all
select pact_id, 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'member', 'Member', 'on_track_only'
from pact_activity_test_state;

insert into public.savings_pact_entries (
  pact_id, member_user_id, savings_home_id, entry_type, delta_cents, note
)
select pact_id, 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, owner_home_id, 'pending', 1000,
  'Owner private note'
from pact_activity_test_state
union all
select pact_id, 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, member_home_id, 'pending', 5000,
  'Member private note'
from pact_activity_test_state;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}',
  true
);

do $$
declare
  target_pact uuid := (select pact_id from pact_activity_test_state);
  member_activity_id uuid;
begin
  if (select count(*) from public.get_savings_pact_activity(target_pact, 20)) <> 2 then
    raise exception 'An active member did not receive the complete Circle activity feed.';
  end if;

  if (
    select amount_cents is not null or amount_visible
    from public.get_savings_pact_activity(target_pact, 20)
    where actor_user_id = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  ) then
    raise exception 'On-track-only activity exposed another member''s exact amount.';
  end if;

  if (
    select amount_cents
    from public.get_savings_pact_activity(target_pact, 20)
    where actor_user_id = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ) <> 1000 then
    raise exception 'A member could not see their own exact activity amount.';
  end if;

  select activity_id into member_activity_id
  from public.get_savings_pact_activity(target_pact, 20)
  where actor_user_id = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

  if not public.toggle_savings_pact_activity_cheer(member_activity_id) then
    raise exception 'The first Circle cheer was not created.';
  end if;

  if not (
    select cheer_count = 1 and cheered_by_me
    from public.get_savings_pact_activity_cheers(target_pact)
    where activity_id = member_activity_id
  ) then
    raise exception 'The aggregate Circle cheer was not visible to its creator.';
  end if;

  if public.toggle_savings_pact_activity_cheer(member_activity_id) then
    raise exception 'The second Circle cheer toggle did not remove the cheer.';
  end if;

  perform public.toggle_savings_pact_activity_cheer(member_activity_id);

  if (select count(*) from public.savings_pact_activity_cheers) <> 1 then
    raise exception 'A member could not read their own cheer for private export.';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2","role":"authenticated"}',
  true
);

do $$
declare
  target_pact uuid := (select pact_id from pact_activity_test_state);
  own_activity_id uuid;
begin
  if (
    select amount_cents
    from public.get_savings_pact_activity(target_pact, 20)
    where actor_user_id = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  ) <> 5000 then
    raise exception 'The contributing member could not see their own exact activity amount.';
  end if;

  select activity_id into own_activity_id
  from public.get_savings_pact_activity(target_pact, 20)
  where actor_user_id = 'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

  if not (
    select cheer_count = 1 and not cheered_by_me
    from public.get_savings_pact_activity_cheers(target_pact)
    where activity_id = own_activity_id
  ) then
    raise exception 'Circle cheers leaked the reactor or produced the wrong aggregate.';
  end if;

  if (select count(*) from public.savings_pact_activity_cheers) <> 0 then
    raise exception 'A member directly discovered another person''s cheer.';
  end if;

  begin
    perform public.toggle_savings_pact_activity_cheer(own_activity_id);
    raise exception 'A member unexpectedly cheered their own activity.';
  exception
    when invalid_parameter_value then
      null;
  end;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.savings_pact_activity_cheers) <> 0 then
    raise exception 'An outsider directly discovered Circle cheers.';
  end if;

  begin
    perform public.get_savings_pact_activity(
      (select pact_id from pact_activity_test_state),
      20
    );
    raise exception 'An outsider unexpectedly read Circle activity.';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform public.get_savings_pact_activity_cheers(
      (select pact_id from pact_activity_test_state)
    );
    raise exception 'An outsider unexpectedly read aggregate Circle cheers.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

rollback;
