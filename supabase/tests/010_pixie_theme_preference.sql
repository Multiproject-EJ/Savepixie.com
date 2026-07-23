begin;

insert into auth.users (id, email)
values
  ('f1111111-1111-4111-8111-111111111111', 'pixie-owner@savepixie.invalid'),
  ('f2222222-2222-4222-8222-222222222222', 'pixie-other@savepixie.invalid');

insert into public.profiles (id, display_name)
values
  ('f1111111-1111-4111-8111-111111111111', 'Pixie Owner'),
  ('f2222222-2222-4222-8222-222222222222', 'Other Saver');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

update public.profiles
set pixie_theme = 'ember'
where id = 'f1111111-1111-4111-8111-111111111111';

update public.profiles
set pixie_theme = 'grove'
where id = 'f2222222-2222-4222-8222-222222222222';

reset role;

do $$
begin
  if (
    select pixie_theme
    from public.profiles
    where id = 'f1111111-1111-4111-8111-111111111111'
  ) <> 'ember' then
    raise exception 'A saver could not update their own Pixie.';
  end if;

  if (
    select pixie_theme
    from public.profiles
    where id = 'f2222222-2222-4222-8222-222222222222'
  ) <> 'tide' then
    raise exception 'A saver changed another account''s Pixie or the Tide default is missing.';
  end if;
end;
$$;

rollback;
