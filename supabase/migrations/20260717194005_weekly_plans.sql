-- SavePixie's intentionally small weekly spending plan.
--
-- Each signed-in user owns one row per calendar week. Amounts are stored in
-- integer minor units (øre/cents), while the client presents whole kroner.
-- Keeping historical rows makes a later weekly review possible without
-- turning the first release into a full budgeting ledger.

create table public.weekly_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  available_cents bigint not null default 0 check (available_cents >= 0),
  committed_cents bigint not null default 0 check (committed_cents >= 0),
  saving_cents bigint not null default 0 check (saving_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_plans enable row level security;

create policy weekly_plans_select_own
on public.weekly_plans for select to authenticated
using ((select auth.uid()) = user_id);

create policy weekly_plans_insert_own
on public.weekly_plans for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy weekly_plans_update_own
on public.weekly_plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.weekly_plans from public, anon, authenticated;
grant select, insert on table public.weekly_plans to authenticated;
grant update (available_cents, committed_cents, saving_cents, updated_at)
  on table public.weekly_plans to authenticated;
