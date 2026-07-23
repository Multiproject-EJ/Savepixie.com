-- Give each saver a preferred planning currency and a realistic monthly
-- savings boundary. Each Pact snapshots its owner's currency so shared goals
-- retain a single, unambiguous unit even when members live elsewhere.

alter table public.profiles
  add column if not exists currency_code text not null default 'NOK',
  add column if not exists monthly_savings_capacity_cents bigint;

alter table public.savings_pacts
  add column if not exists currency_code text not null default 'NOK';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_currency_code_format'
  ) then
    alter table public.profiles
      add constraint profiles_currency_code_format
      check (currency_code ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_monthly_savings_capacity_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_monthly_savings_capacity_nonnegative
      check (
        monthly_savings_capacity_cents is null
        or monthly_savings_capacity_cents >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.savings_pacts'::regclass
      and conname = 'savings_pacts_currency_code_format'
  ) then
    alter table public.savings_pacts
      add constraint savings_pacts_currency_code_format
      check (currency_code ~ '^[A-Z]{3}$');
  end if;
end;
$$;

create or replace function public.create_savings_pact(
  p_mode text,
  p_name text,
  p_target_cents bigint,
  p_emoji text default '✨',
  p_color text default '#7b3fff',
  p_deadline_date date default null,
  p_contribution_rule text default 'flexible',
  p_privacy_mode text default 'on_track_only'
)
returns public.savings_pacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  member_display_name text;
  member_currency_code text;
  created_pact public.savings_pacts;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_mode not in ('solo', 'shared') then
    raise exception 'Pact mode must be solo or shared.' using errcode = '22023';
  end if;

  select
    coalesce(nullif(trim(display_name), ''), 'Saver'),
    currency_code
  into member_display_name, member_currency_code
  from public.profiles
  where id = request_user_id;

  member_display_name := coalesce(member_display_name, 'Saver');
  member_currency_code := coalesce(member_currency_code, 'NOK');

  insert into public.savings_pacts (
    created_by,
    mode,
    name,
    target_cents,
    emoji,
    color,
    deadline_date,
    contribution_rule,
    currency_code
  )
  values (
    request_user_id,
    p_mode,
    trim(p_name),
    p_target_cents,
    p_emoji,
    p_color,
    p_deadline_date,
    p_contribution_rule,
    member_currency_code
  )
  returning * into created_pact;

  insert into public.savings_pact_members (
    pact_id,
    user_id,
    role,
    display_name,
    privacy_mode
  )
  values (
    created_pact.id,
    request_user_id,
    'owner',
    member_display_name,
    p_privacy_mode
  );

  return created_pact;
end;
$$;

grant insert (currency_code, monthly_savings_capacity_cents)
  on public.profiles to authenticated;
grant update (currency_code, monthly_savings_capacity_cents)
  on public.profiles to authenticated;
grant insert (currency_code) on public.savings_pacts to authenticated;
grant update (currency_code) on public.savings_pacts to authenticated;

comment on column public.profiles.currency_code is
  'The saver''s ISO 4217 display and planning currency.';
comment on column public.profiles.monthly_savings_capacity_cents is
  'A user-entered comfortable monthly boundary for assessing goal feasibility; not income or bank data.';
comment on column public.savings_pacts.currency_code is
  'The ISO 4217 currency used by every amount in this Pact.';

notify pgrst, 'reload schema';
