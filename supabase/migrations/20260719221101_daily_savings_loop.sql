-- The daily loop records useful behavior, not app-open time. One completion per
-- saver and local calendar day keeps streaks understandable and duplicate-safe.

create table if not exists public.daily_saver_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= current_streak),
  stardust_total integer not null default 0 check (stardust_total >= 0),
  completed_moves integer not null default 0 check (completed_moves >= 0),
  last_completed_on date,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_move_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  move_id text not null check (move_id ~ '^[a-z0-9-]{2,64}$'),
  local_date date not null,
  completion_kind text not null check (completion_kind in ('action', 'save')),
  pact_id uuid references public.savings_pacts(id) on delete set null,
  saved_cents bigint not null default 0 check (saved_cents >= 0),
  stardust_awarded integer not null check (stardust_awarded between 1 and 100),
  reflection text check (reflection is null or char_length(reflection) <= 280),
  created_at timestamptz not null default now(),
  constraint daily_move_completions_user_id_local_date_key unique (user_id, local_date),
  check (
    (completion_kind = 'action' and saved_cents = 0)
    or (completion_kind = 'save' and saved_cents > 0 and pact_id is not null)
  )
);

create index if not exists daily_move_completions_user_created_idx
on public.daily_move_completions (user_id, created_at desc);

create index if not exists daily_move_completions_pact_id_idx
on public.daily_move_completions (pact_id)
where pact_id is not null;

alter table public.daily_saver_progress enable row level security;
alter table public.daily_move_completions enable row level security;

drop policy if exists daily_saver_progress_select_own on public.daily_saver_progress;
drop policy if exists daily_move_completions_select_own on public.daily_move_completions;

create policy daily_saver_progress_select_own
on public.daily_saver_progress
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy daily_move_completions_select_own
on public.daily_move_completions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function private.complete_daily_savings_move(
  requested_move_id text,
  requested_local_date date,
  requested_completion_kind text,
  requested_pact_id uuid default null,
  requested_savings_home_id uuid default null,
  requested_saved_cents bigint default 0,
  requested_reflection text default null
)
returns table (
  completion_id uuid,
  move_id text,
  local_date date,
  completion_kind text,
  pact_id uuid,
  saved_cents bigint,
  stardust_awarded integer,
  current_streak integer,
  best_streak integer,
  stardust_total integer,
  completed_moves integer,
  last_completed_on date,
  was_already_complete boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid := (select auth.uid());
  normalized_move_id text := lower(trim(requested_move_id));
  normalized_reflection text := nullif(trim(requested_reflection), '');
  awarded_stardust integer;
  inserted_completion public.daily_move_completions;
  existing_completion public.daily_move_completions;
  progress_row public.daily_saver_progress;
  next_streak integer;
begin
  if request_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if normalized_move_id is null or normalized_move_id !~ '^[a-z0-9-]{2,64}$' then
    raise exception 'Savings Move identifier is invalid.' using errcode = '22023';
  end if;

  if requested_local_date is null
    or requested_local_date < current_date - 1
    or requested_local_date > current_date + 1 then
    raise exception 'Savings Move date is outside the allowed local-day window.' using errcode = '22023';
  end if;

  if requested_completion_kind not in ('action', 'save') then
    raise exception 'Completion kind must be action or save.' using errcode = '22023';
  end if;

  if normalized_reflection is not null and char_length(normalized_reflection) > 280 then
    raise exception 'Reflection must be 280 characters or fewer.' using errcode = '22023';
  end if;

  if requested_completion_kind = 'save' then
    if requested_pact_id is null
      or requested_savings_home_id is null
      or requested_saved_cents is null
      or requested_saved_cents <= 0 then
      raise exception 'A positive amount, Pact, and Savings Home are required.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.savings_pact_members member
      join public.savings_pacts pact on pact.id = member.pact_id
      where member.pact_id = requested_pact_id
        and member.user_id = request_user_id
        and member.status = 'active'
        and pact.status = 'active'
    ) then
      raise exception 'Choose an active Pact that belongs to you.' using errcode = '42501';
    end if;

    if not exists (
      select 1
      from public.savings_homes home
      where home.id = requested_savings_home_id
        and home.user_id = request_user_id
    ) then
      raise exception 'Choose your own Savings Home.' using errcode = '42501';
    end if;

    awarded_stardust := 35;
  else
    if requested_saved_cents <> 0
      or requested_pact_id is not null
      or requested_savings_home_id is not null then
      raise exception 'Action-only Moves cannot record bank money.' using errcode = '22023';
    end if;

    awarded_stardust := 25;
  end if;

  insert into public.daily_saver_progress (user_id)
  values (request_user_id)
  on conflict (user_id) do nothing;

  select *
    into progress_row
  from public.daily_saver_progress
  where user_id = request_user_id
  for update;

  if progress_row.last_completed_on is not null
    and requested_local_date < progress_row.last_completed_on then
    raise exception 'A newer Savings Move is already complete.' using errcode = '22023';
  end if;

  insert into public.daily_move_completions (
    user_id,
    move_id,
    local_date,
    completion_kind,
    pact_id,
    saved_cents,
    stardust_awarded,
    reflection
  )
  values (
    request_user_id,
    normalized_move_id,
    requested_local_date,
    requested_completion_kind,
    requested_pact_id,
    case when requested_completion_kind = 'save' then requested_saved_cents else 0 end,
    awarded_stardust,
    normalized_reflection
  )
  on conflict on constraint daily_move_completions_user_id_local_date_key do nothing
  returning * into inserted_completion;

  if inserted_completion.id is null then
    select *
      into existing_completion
    from public.daily_move_completions completion
    where completion.user_id = request_user_id
      and completion.local_date = requested_local_date;

    select *
      into progress_row
    from public.daily_saver_progress
    where user_id = request_user_id;

    return query select
      existing_completion.id,
      existing_completion.move_id,
      existing_completion.local_date,
      existing_completion.completion_kind,
      existing_completion.pact_id,
      existing_completion.saved_cents,
      existing_completion.stardust_awarded,
      progress_row.current_streak,
      progress_row.best_streak,
      progress_row.stardust_total,
      progress_row.completed_moves,
      progress_row.last_completed_on,
      true;
    return;
  end if;

  if requested_completion_kind = 'save' then
    insert into public.savings_pact_entries (
      pact_id,
      member_user_id,
      savings_home_id,
      entry_type,
      delta_cents,
      verification_state,
      note
    )
    values (
      requested_pact_id,
      request_user_id,
      requested_savings_home_id,
      'pending',
      requested_saved_cents,
      'unverified',
      coalesce(normalized_reflection, 'Daily Savings Move')
    );
  end if;

  if progress_row.last_completed_on is null then
    next_streak := 1;
  elsif progress_row.last_completed_on = requested_local_date - 1 then
    next_streak := progress_row.current_streak + 1;
  else
    next_streak := 1;
  end if;

  insert into public.daily_saver_progress (
    user_id,
    current_streak,
    best_streak,
    stardust_total,
    completed_moves,
    last_completed_on,
    updated_at
  )
  values (
    request_user_id,
    next_streak,
    next_streak,
    awarded_stardust,
    1,
    requested_local_date,
    now()
  )
  on conflict (user_id) do update
  set current_streak = next_streak,
      best_streak = greatest(public.daily_saver_progress.best_streak, next_streak),
      stardust_total = public.daily_saver_progress.stardust_total + awarded_stardust,
      completed_moves = public.daily_saver_progress.completed_moves + 1,
      last_completed_on = requested_local_date,
      updated_at = now()
  returning * into progress_row;

  return query select
    inserted_completion.id,
    inserted_completion.move_id,
    inserted_completion.local_date,
    inserted_completion.completion_kind,
    inserted_completion.pact_id,
    inserted_completion.saved_cents,
    inserted_completion.stardust_awarded,
    progress_row.current_streak,
    progress_row.best_streak,
    progress_row.stardust_total,
    progress_row.completed_moves,
    progress_row.last_completed_on,
    false;
end;
$$;

create or replace function public.complete_daily_savings_move(
  p_move_id text,
  p_local_date date,
  p_completion_kind text,
  p_pact_id uuid default null,
  p_savings_home_id uuid default null,
  p_saved_cents bigint default 0,
  p_reflection text default null
)
returns table (
  completion_id uuid,
  move_id text,
  local_date date,
  completion_kind text,
  pact_id uuid,
  saved_cents bigint,
  stardust_awarded integer,
  current_streak integer,
  best_streak integer,
  stardust_total integer,
  completed_moves integer,
  last_completed_on date,
  was_already_complete boolean
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.complete_daily_savings_move(
    p_move_id,
    p_local_date,
    p_completion_kind,
    p_pact_id,
    p_savings_home_id,
    p_saved_cents,
    p_reflection
  );
$$;

revoke all on table
  public.daily_saver_progress,
  public.daily_move_completions
from anon, authenticated;

grant select on table
  public.daily_saver_progress,
  public.daily_move_completions
to authenticated;

grant select, insert, update, delete on table
  public.daily_saver_progress,
  public.daily_move_completions
to service_role;

revoke all on function private.complete_daily_savings_move(
  text, date, text, uuid, uuid, bigint, text
)
from public, anon;

grant execute on function private.complete_daily_savings_move(
  text, date, text, uuid, uuid, bigint, text
)
to authenticated;

revoke all on function public.complete_daily_savings_move(
  text, date, text, uuid, uuid, bigint, text
)
from public, anon;

grant execute on function public.complete_daily_savings_move(
  text, date, text, uuid, uuid, bigint, text
)
to authenticated;

notify pgrst, 'reload schema';
