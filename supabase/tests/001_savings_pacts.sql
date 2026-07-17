begin;

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'pact-a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'pact-b@example.invalid');

insert into public.profiles (id, display_name)
values
  ('11111111-1111-4111-8111-111111111111', 'Aster'),
  ('22222222-2222-4222-8222-222222222222', 'Bramble');

set local role authenticated;

create temp table pact_test_state (
  home_a uuid,
  home_b uuid,
  solo_pact uuid,
  shared_pact uuid,
  invite_token uuid
);

grant select on pact_test_state to service_role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

with created as (
  insert into public.savings_homes (
    user_id, label, provider_name, account_hint, reported_balance_cents
  )
  values (
    '11111111-1111-4111-8111-111111111111',
    'Aster Savings Home',
    'Example Bank',
    '••42',
    10000
  )
  returning id
)
insert into pact_test_state (home_a)
select id from created;

update pact_test_state
set solo_pact = (
  select (public.create_savings_pact(
    'solo', 'Solo cushion', 25000, '🌿', '#38dfc6', null, 'flexible', 'private'
  )).id
);

update pact_test_state
set shared_pact = (
  select (public.create_savings_pact(
    'shared', 'Cabin weekend', 60000, '🏕️', '#7b3fff', null, 'equal', 'on_track_only'
  )).id
);

select public.record_pending_pact_save(
  shared_pact,
  home_a,
  1000,
  'First manual save'
)
from pact_test_state;

update pact_test_state
set invite_token = public.create_savings_pact_invite(shared_pact);

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);

with created as (
  insert into public.savings_homes (
    user_id, label, provider_name, account_hint, reported_balance_cents
  )
  values (
    '22222222-2222-4222-8222-222222222222',
    'Bramble Savings Home',
    'Example Credit Union',
    '••87',
    8000
  )
  returning id
)
update pact_test_state
set home_b = created.id
from created;

select public.join_savings_pact(invite_token)
from pact_test_state;

select public.record_pending_pact_save(
  shared_pact,
  home_b,
  1500,
  'Joining the Pact'
)
from pact_test_state;

do $$
begin
  if (select count(*) from public.savings_pacts) <> 1 then
    raise exception 'Member B should see exactly the shared Pact.';
  end if;
  if (select count(*) from public.savings_homes) <> 1 then
    raise exception 'Member B should see only their own Savings Home.';
  end if;
  if (select count(*) from public.savings_pact_entries) <> 1 then
    raise exception 'On-track privacy should hide Member A exact entries from Member B.';
  end if;
end
$$;

reset role;
select set_config('request.jwt.claims', '{}', true);
set local role service_role;

update public.savings_homes
set connection_status = 'connected',
    verified_balance_cents = 5000,
    last_verified_at = now()
where id = (select home_a from pact_test_state);

insert into public.savings_pact_entries (
  pact_id,
  member_user_id,
  savings_home_id,
  entry_type,
  delta_cents,
  verification_state,
  note
)
select
  shared_pact,
  '11111111-1111-4111-8111-111111111111',
  home_a,
  'allocation',
  4000,
  'verified',
  'Provider-matched allocation'
from pact_test_state;

do $$
begin
  begin
    insert into public.savings_pact_entries (
      pact_id,
      member_user_id,
      savings_home_id,
      entry_type,
      delta_cents,
      verification_state,
      note
    )
    select
      shared_pact,
      '11111111-1111-4111-8111-111111111111',
      home_a,
      'allocation',
      2000,
      'verified',
      'Must exceed the verified balance'
    from pact_test_state;
    raise exception 'Over-allocation unexpectedly succeeded.';
  exception
    when check_violation then
      null;
  end;
end
$$;

do $$
begin
  if (
    select verified_cents
    from public.savings_pacts
    where id = (select shared_pact from pact_test_state)
  ) <> 4000 then
    raise exception 'Verified projection is incorrect.';
  end if;
  if (
    select reported_cents
    from public.savings_pacts
    where id = (select shared_pact from pact_test_state)
  ) <> 6500 then
    raise exception 'Reported projection is incorrect.';
  end if;
end
$$;

reset role;
rollback;
