begin;

insert into auth.users (id, email)
values ('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', 'currency-test@savepixie.invalid');

insert into public.profiles (
  id,
  display_name,
  currency_code,
  monthly_savings_capacity_cents
)
values (
  'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1',
  'Currency Tester',
  'USD',
  25000
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1","role":"authenticated"}',
  true
);

update public.profiles
set currency_code = 'EUR',
    monthly_savings_capacity_cents = 30000
where id = 'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1';

select public.create_savings_pact(
  'solo',
  'Currency-safe dream',
  120000,
  '✨',
  '#7b3fff',
  (current_date + interval '12 months')::date,
  'flexible',
  'private'
);

reset role;

do $$
begin
  if (
    select currency_code
    from public.profiles
    where id = 'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1'
  ) <> 'EUR' then
    raise exception 'The saver could not update their own planning currency.';
  end if;

  if (
    select monthly_savings_capacity_cents
    from public.profiles
    where id = 'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1'
  ) <> 30000 then
    raise exception 'The saver could not update their own monthly savings boundary.';
  end if;

  if (
    select currency_code
    from public.savings_pacts
    where created_by = 'eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1'
  ) <> 'EUR' then
    raise exception 'A new Pact did not snapshot the owner''s selected currency.';
  end if;
end;
$$;

rollback;
