-- SavePixie's production database baseline and savings-ledger hardening.
-- This migration can bootstrap a new dedicated project or harden the legacy
-- profiles/goals schema before the first customer is admitted.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_cents bigint not null,
  saved_cents bigint not null default 0,
  emoji text default '🏦',
  color text default '#7C3AED',
  deadline_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  delta_cents bigint not null,
  note text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.goals'::regclass
      and conname = 'goals_target_cents_positive'
  ) then
    alter table public.goals
      add constraint goals_target_cents_positive check (target_cents > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.goals'::regclass
      and conname = 'goals_saved_cents_nonnegative'
  ) then
    alter table public.goals
      add constraint goals_saved_cents_nonnegative check (saved_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.goals'::regclass
      and conname = 'goals_id_user_id_key'
  ) then
    alter table public.goals
      add constraint goals_id_user_id_key unique (id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.goal_events'::regclass
      and conname = 'goal_events_delta_cents_positive'
  ) then
    alter table public.goal_events
      add constraint goal_events_delta_cents_positive check (delta_cents > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.goal_events'::regclass
      and conname = 'goal_events_note_length'
  ) then
    alter table public.goal_events
      add constraint goal_events_note_length
      check (note is null or char_length(note) <= 240);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.goal_events'::regclass
      and conname = 'goal_events_goal_owner_fkey'
  ) then
    alter table public.goal_events
      add constraint goal_events_goal_owner_fkey
      foreign key (goal_id, user_id)
      references public.goals(id, user_id)
      on delete cascade;
  end if;
end
$$;

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goal_events_user_id_idx on public.goal_events (user_id);
create index if not exists goal_events_goal_id_idx on public.goal_events (goal_id);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.goal_events enable row level security;

drop policy if exists "read own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

drop policy if exists "goals own rows" on public.goals;
drop policy if exists goals_select_own on public.goals;
drop policy if exists goals_insert_own on public.goals;

create policy goals_select_own
on public.goals
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy goals_insert_own
on public.goals
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "goal_events own rows" on public.goal_events;
drop policy if exists goal_events_select_own on public.goal_events;
drop policy if exists goal_events_insert_own on public.goal_events;

create policy goal_events_select_own
on public.goal_events
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy goal_events_insert_own
on public.goal_events
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.goals
    where goals.id = goal_events.goal_id
      and goals.user_id = (select auth.uid())
  )
);

-- The browser can append an owned event, but it cannot rewrite balances or
-- history. This private trigger is the sole writer of goals.saved_cents.
create or replace function private.apply_goal_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
begin
  if request_user_id is null or request_user_id <> new.user_id then
    raise exception 'Goal event owner does not match the authenticated user.'
      using errcode = '42501';
  end if;

  update public.goals
  set saved_cents = saved_cents + new.delta_cents
  where id = new.goal_id
    and user_id = new.user_id;

  if not found then
    raise exception 'The selected goal does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.apply_goal_event() from public, anon, authenticated;

drop trigger if exists apply_goal_event_after_insert on public.goal_events;

create trigger apply_goal_event_after_insert
after insert on public.goal_events
for each row
execute function private.apply_goal_event();

-- One authenticated API request records the event and returns the atomically
-- updated goal. SECURITY INVOKER keeps normal grants and RLS in force.
create or replace function public.record_goal_deposit(
  p_goal_id uuid,
  p_amount_cents bigint,
  p_note text default null
)
returns public.goals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  updated_goal public.goals;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Deposit amount must be greater than zero.' using errcode = '22023';
  end if;

  if p_note is not null and char_length(p_note) > 240 then
    raise exception 'Deposit note must be 240 characters or fewer.' using errcode = '22023';
  end if;

  insert into public.goal_events (user_id, goal_id, delta_cents, note)
  values (request_user_id, p_goal_id, p_amount_cents, p_note);

  select goals.*
  into updated_goal
  from public.goals as goals
  where goals.id = p_goal_id
    and goals.user_id = request_user_id;

  if not found then
    raise exception 'Goal not found.' using errcode = 'P0002';
  end if;

  return updated_goal;
end;
$$;

revoke all on function public.record_goal_deposit(uuid, bigint, text)
from public, anon;
grant execute on function public.record_goal_deposit(uuid, bigint, text)
to authenticated;

revoke all on table public.profiles, public.goals, public.goal_events
from anon, authenticated;

grant select on table public.profiles to authenticated;
grant insert (id, username, display_name, avatar_url) on table public.profiles to authenticated;
grant update (username, display_name, avatar_url) on table public.profiles to authenticated;
grant select on table public.goals to authenticated;
grant insert (user_id, name, target_cents, emoji, color, deadline_date)
on table public.goals to authenticated;
grant select on table public.goal_events to authenticated;
grant insert (user_id, goal_id, delta_cents, note)
on table public.goal_events to authenticated;

grant select, insert, update, delete
on table public.profiles, public.goals, public.goal_events
to service_role;

notify pgrst, 'reload schema';
