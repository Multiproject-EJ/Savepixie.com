begin;

insert into auth.users (id, email)
values
  ('33333333-3333-4333-8333-333333333333', 'plan-a@example.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'plan-b@example.invalid');

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);

insert into public.weekly_plans (
  user_id,
  week_start,
  available_cents,
  committed_cents,
  saving_cents
)
values (
  '33333333-3333-4333-8333-333333333333',
  date '2026-07-13',
  180000,
  83000,
  35000
)
on conflict (user_id, week_start) do update
set available_cents = excluded.available_cents,
    committed_cents = excluded.committed_cents,
    saving_cents = excluded.saving_cents,
    updated_at = now();

do $$
begin
  if (select count(*) from public.weekly_plans) <> 1 then
    raise exception 'Plan owner should see exactly their own weekly plan.';
  end if;

  begin
    insert into public.weekly_plans (user_id, week_start)
    values ('44444444-4444-4444-8444-444444444444', date '2026-07-13');
    raise exception 'Creating another user''s weekly plan unexpectedly succeeded.';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);

insert into public.weekly_plans (
  user_id,
  week_start,
  available_cents,
  committed_cents,
  saving_cents
)
values (
  '44444444-4444-4444-8444-444444444444',
  date '2026-07-13',
  90000,
  40000,
  10000
);

do $$
begin
  if (select count(*) from public.weekly_plans) <> 1 then
    raise exception 'User B should see only User B''s plan.';
  end if;

  if exists (
    select 1
    from public.weekly_plans
    where user_id = '33333333-3333-4333-8333-333333333333'
  ) then
    raise exception 'User B can see User A''s weekly plan.';
  end if;
end
$$;

reset role;
rollback;
