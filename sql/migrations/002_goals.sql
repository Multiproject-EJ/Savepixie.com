create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_cents bigint not null check (target_cents > 0),
  saved_cents bigint not null default 0,
  emoji text default '🏦',
  color text default '#7C3AED',
  deadline_date date,
  created_at timestamptz default now()
);

create table public.goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  delta_cents bigint not null,
  note text,
  created_at timestamptz default now()
);

alter table public.goals enable row level security;
alter table public.goal_events enable row level security;

create policy "goals own rows" on public.goals
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goal_events own rows" on public.goal_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
