begin;

insert into auth.users (id, email)
values
  ('88888888-8888-4888-8888-888888888888', 'daily-loop-saver@example.invalid'),
  ('99999999-9999-4999-8999-999999999999', 'daily-loop-outsider@example.invalid');

insert into public.profiles (id, display_name)
values
  ('88888888-8888-4888-8888-888888888888', 'Daily Saver'),
  ('99999999-9999-4999-8999-999999999999', 'Daily Outsider');

set local role authenticated;

create temp table daily_loop_test_state (
  savings_home_id uuid,
  pact_id uuid
);

insert into daily_loop_test_state default values;

select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',
  true
);

with created_home as (
  insert into public.savings_homes (user_id, label)
  values ('88888888-8888-4888-8888-888888888888', 'Daily Savings Home')
  returning id
)
update daily_loop_test_state
set savings_home_id = created_home.id
from created_home;

update daily_loop_test_state
set pact_id = (
  select (public.create_savings_pact('solo', 'Daily goal', 100000)).id
);

do $$
declare
  first_result record;
  replay_result record;
  second_result record;
  created_pact_id uuid := (select pact_id from daily_loop_test_state);
  created_home_id uuid := (select savings_home_id from daily_loop_test_state);
begin
  select * into first_result
  from public.complete_daily_savings_move(
    'pause-power',
    current_date - 1,
    'action',
    null,
    null,
    0,
    'Paused one purchase.'
  );

  if first_result.current_streak <> 1
    or first_result.best_streak <> 1
    or first_result.stardust_total <> 25
    or first_result.completed_moves <> 1
    or first_result.was_already_complete then
    raise exception 'First action completion produced incorrect progress.';
  end if;

  select * into replay_result
  from public.complete_daily_savings_move(
    'found-money',
    current_date - 1,
    'action',
    null,
    null,
    0,
    'A duplicate request must not replace the first Move.'
  );

  if not replay_result.was_already_complete
    or replay_result.move_id <> 'pause-power'
    or replay_result.stardust_total <> 25
    or (
      select count(*)
      from public.daily_move_completions
      where user_id = '88888888-8888-4888-8888-888888888888'
    ) <> 1 then
    raise exception 'Daily Move replay was not idempotent.';
  end if;

  select * into second_result
  from public.complete_daily_savings_move(
    'swap-and-save',
    current_date,
    'save',
    created_pact_id,
    created_home_id,
    5000,
    'Swapped lunch and moved the difference.'
  );

  if second_result.current_streak <> 2
    or second_result.best_streak <> 2
    or second_result.stardust_total <> 60
    or second_result.completed_moves <> 2
    or second_result.saved_cents <> 5000 then
    raise exception 'Consecutive save completion produced incorrect progress.';
  end if;

  if (
    select count(*)
    from public.savings_pact_entries entry
    where entry.member_user_id = '88888888-8888-4888-8888-888888888888'
      and entry.pact_id = created_pact_id
      and entry.delta_cents = 5000
      and entry.entry_type = 'pending'
  ) <> 1 then
    raise exception 'Daily saving Move did not create exactly one pending ledger entry.';
  end if;

  if (
    select reported_cents
    from public.savings_pacts
    where id = created_pact_id
  ) <> 5000 then
    raise exception 'Daily saving Move did not update Pact progress.';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}',
    true
  );

  if (select count(*) from public.daily_saver_progress) <> 0
    or (select count(*) from public.daily_move_completions) <> 0 then
    raise exception 'RLS exposed another saver''s daily progress.';
  end if;

  begin
    perform public.complete_daily_savings_move(
      'swap-and-save',
      current_date,
      'save',
      created_pact_id,
      created_home_id,
      5000,
      null
    );
    raise exception 'Outsider unexpectedly completed a Move against another saver''s Pact.';
  exception
    when sqlstate '42501' then null;
  end;
end;
$$;

rollback;
