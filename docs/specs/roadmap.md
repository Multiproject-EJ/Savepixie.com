# SavePixie Development Roadmap

This roadmap captures the end-to-end plan for building **SavePixie**, a mobile-first personal savings coach delivered as a static PWA hosted on GitHub Pages. The client application will be implemented with Vite, React, and TypeScript, while Supabase provides authentication, Postgres storage, and row-level security (RLS). No other backend services are required.

Each step in the roadmap is designed to become its own pull request and release. Every section below includes the goal, required tasks, database schema work, primary files to touch, acceptance criteria, and a short note about what comes next. Follow the steps sequentially to deliver the full product experience.

> **How to use this with Codex**
> - Reference the desired step explicitly in your prompt (e.g., "Start Step 3 from the SavePixie roadmap").
> - Codex should implement the listed tasks, run or document the SQL migration, and update the worklog template for that step.
> - Once a step is merged, move on to the next numbered step using the same pattern.

> **Workflow conventions**
> - Branch naming: `feature/<step-number>-<short-name>`
> - Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`)
> - Pull request template sections: Goal / Changes / SQL / Testing / Screens / NEXT
> - Release tagging: `v<major>.<minor>.<patch>` aligned with the step version

## Step 0 — Initialize Repo & Tooling (v0.0.1)
**Goal:** Bootstrapped Vite + React + TypeScript PWA with GitHub Pages deployment.

**Tasks**
- Initialize the Vite project with React and TypeScript.
- Wire up React Router with `/`, `/auth`, and `/dashboard` routes.
- Add the PWA shell: `manifest.webmanifest` and `service-worker.ts` for offline shell caching.
- Create the Supabase client in `src/lib/supabase.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Provide `.env.example`, `.editorconfig`, `.prettierrc`, and (optionally) a CI lint workflow.
- Configure GitHub Pages deployment workflow targeting the `main` branch.

**Schema/Migrations:** None (client-only setup).

**Files**
- `index.html`, `src/main.tsx`, `src/app/App.tsx`
- `src/lib/supabase.ts`
- `public/manifest.webmanifest`, `public/icons/*`
- `.github/workflows/deploy.yml`
- `/docs/specs/01-foundation.md`

**Acceptance Criteria**
- App builds successfully and deploys to `https://savepixie.com` (via GitHub Pages + CNAME).
- PWA installs and loads the blank shell offline.

**NEXT:** Step 1 – Supabase Auth & Profiles.

## Step 1 — Supabase Auth + Profiles (v0.1.0)
**Goal:** Email/password authentication with a per-user profile record.

**Schema/Migrations** (`/sql/migrations/001_auth_profiles.sql`)
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );
```

**Tasks**
- Build authentication screens (`/auth`) with sign-up, sign-in, and password reset.
- After first login, upsert the `profiles` table with `id = user.id`.
- Implement a global `AuthProvider` and route guard so `/dashboard` requires authentication.

**Files**
- `src/pages/auth/*`, `src/app/AuthProvider.tsx`
- `src/features/profile/api.ts`

**Acceptance Criteria**
- A new user can sign up, refresh, and remain logged in.
- The matching `profiles` row exists and can be edited by the user.

**NEXT:** Step 2 – Goals & Deposits.

## Step 2 — Savings Goals + Deposits (v0.2.0)
**Goal:** Create savings goals, record deposits, and display progress.

**Schema/Migrations** (`/sql/migrations/002_goals.sql`)
```sql
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
```

**Tasks**
- Display goals on `/dashboard` as progress cards (rings, emoji, colors).
- Provide "New Goal" and "Deposit" modals with optimistic updates.
- Persist `goal_events` and update `saved_cents` on deposits/withdrawals.

**Files**
- `src/features/goals/*` (components, hooks, API helpers).

**Acceptance Criteria**
- Users can create goals, deposit funds, and see progress update instantly.
- Refreshing the app shows the same state from Supabase.

**NEXT:** Step 3 – Streak Engine.

## Step 3 — Streak Engine (v0.3.0)
**Goal:** Track daily and weekly deposit streaks.

**Schema/Migrations** (`/sql/migrations/003_streaks.sql`)
```sql
create table public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_current int default 0,
  daily_best int default 0,
  weekly_current int default 0,
  weekly_best int default 0,
  updated_at timestamptz default now()
);

alter table public.streaks enable row level security;

create policy "streaks own" on public.streaks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Tasks**
- Implement `useStreaks()` hook and streak display widget.
- After each deposit, compute streak updates client-side and persist to Supabase.

**Acceptance Criteria**
- Consecutive daily deposits increase the streak counter.
- Missing a day resets the current streak while preserving best streak.

**NEXT:** Step 4 – Points & Badges.

## Step 4 — Points Ledger + Badges (v0.4.0)
**Goal:** Reward saving behavior with points and badges.

**Schema/Migrations** (`/sql/migrations/004_points_badges.sql`)
```sql
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  points int not null,
  meta jsonb,
  created_at timestamptz default now()
);

create table public.badges (
  id text primary key,
  name text not null,
  description text,
  icon text default '🏅',
  threshold int not null
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id),
  awarded_at timestamptz default now(),
  primary key (user_id, badge_id)
);

alter table public.points_ledger enable row level security;
alter table public.user_badges enable row level security;

create policy "own points" on public.points_ledger
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own user_badges" on public.user_badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Tasks**
- Add `awardPoints(source, points, meta)` helper.
- Implement badge unlocking logic and `/badges` gallery.

**Acceptance Criteria**
- Deposits add ledger entries and accumulate points.
- Reaching thresholds unlocks badges displayed in the UI.

**NEXT:** Step 5 – Challenges.

## Step 5 — Challenges (Daily/Weekly Missions) (v0.5.0)
**Goal:** Configurable missions users can enroll in and complete.

**Schema/Migrations** (`/sql/migrations/005_challenges.sql`)
```sql
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cadence text not null check (cadence in ('daily','weekly','one_off')),
  rule jsonb not null,
  points_reward int not null default 50,
  active boolean default true
);

create table public.challenge_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  status text not null default 'in_progress',
  progress int not null default 0,
  target int not null default 1,
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.challenges enable row level security;
alter table public.challenge_enrollments enable row level security;

create policy "challenges read" on public.challenges for select using (true);
create policy "own enrollments" on public.challenge_enrollments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Tasks**
- Build `/challenges` page for browsing, enrolling, and tracking progress.
- Update deposit handling to advance relevant enrollments and award completion points.
- Celebrate completion with confetti and badge triggers.

**Acceptance Criteria**
- Users can enroll, progress, and complete challenges with points awarded.

**NEXT:** Step 6 – Budgets & Categories.

## Step 6 — Budgets & Categories (v0.6.0)
**Goal:** Monthly budgets with category progress tracking.

**Schema/Migrations** (`/sql/migrations/006_budgets.sql`)
```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#22C55E'
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  created_at timestamptz default now(),
  unique (user_id, month)
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  planned_cents bigint not null check (planned_cents >= 0),
  spent_cents bigint not null default 0
);

alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own budget_lines" on public.budget_lines
  for all using (
    exists (
      select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid()
    )
  );
```

**Tasks**
- Implement `/budget` page to create monthly budgets and category lines.
- Add expense logging that increments `spent_cents` with friendly visuals.

**Acceptance Criteria**
- Users see per-category progress (color-coded) with totals and animations.

**NEXT:** Step 7 – Leaderboard.

## Step 7 — Opt-in Leaderboards (v0.7.0)
**Goal:** Friendly competition using aggregated points.

**Schema/Migrations** (`/sql/migrations/007_leaderboard.sql`)
```sql
create table public.leaderboard_optin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  opted_in boolean default true,
  created_at timestamptz default now()
);

alter table public.leaderboard_optin enable row level security;

create policy "own optin" on public.leaderboard_optin
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Tasks**
- Build `/leaderboard` with weekly and monthly tabs.
- Aggregate `points_ledger` entries client-side for opted-in users.
- Display nicknames only to preserve privacy.

**Acceptance Criteria**
- Opted-in users appear with correct weekly and monthly point totals.

**NEXT:** Step 8 – Playful UI Pass.

## Step 8 — Playful UI Pass (v0.8.0)
**Goal:** Delightful visuals and animations.

**Tasks**
- Create Pixie mascot component with idle, celebrate, and nudge states.
- Add confetti animations on key achievements (goal completion, badges, challenges).
- Update copy to be encouraging and playful.

**Acceptance Criteria**
- Interactions feel celebratory and friendly.

**NEXT:** Step 9 – PWA Offline Enhancements.

## Step 9 — PWA Enhancement & Offline UX (v0.9.0)
**Goal:** Reliable offline experience with action queueing.

**Tasks**
- Enhance service worker to cache the app shell, manifest, and icons.
- Add client-side queue for offline actions (deposits, expenses) using local storage.
- Surface offline banners and ensure optimistic UI during outages.

**Acceptance Criteria**
- App remains usable offline, syncing queued actions on reconnect.

**NEXT:** Step 10 – Settings & Personalization.

## Step 10 — Settings: Themes, Avatars, Notifications (v1.0.0)
**Goal:** Personalization options and in-app reminders.

**Schema/Migrations** (`/sql/migrations/010_settings.sql`)
```sql
create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'pixie',
  currency_code text default 'USD',
  notify_deposit_reminders boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Tasks**
- Build `/settings` page for theme, currency, and reminder toggles.
- Display in-app reminders (non-push) based on toggle states.

**Acceptance Criteria**
- Settings persist per user and reminders respect preferences.

**NEXT:** Step 11 – Education & Tips.

## Step 11 — Micro-Lessons & Tips (v1.1.0)
**Goal:** Bite-size financial tips with point rewards.

**Schema/Migrations** (`/sql/migrations/011_tips.sql`)
```sql
create table public.tips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  points_reward int default 10,
  active boolean default true
);

create table public.user_tips (
  user_id uuid not null references auth.users(id) on delete cascade,
  tip_id uuid not null references public.tips(id) on delete cascade,
  completed_at timestamptz default now(),
  primary key (user_id, tip_id)
);

alter table public.tips enable row level security;
alter table public.user_tips enable row level security;

create policy "read tips" on public.tips for select using (true);
create policy "own user_tips" on public.user_tips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Tasks**
- Build `/learn` page with tip carousel and completion flow.
- Award points when users complete a tip.

**Acceptance Criteria**
- Completed tips persist and reward users.

**NEXT:** Step 12 – Accessibility & Polish.

## Step 12 — Accessibility, Performance, QA, Docs (v1.2.0)
**Goal:** Ship-quality experience with strong accessibility and documentation.

**Tasks**
- Ensure WCAG-compliant navigation, focus management, and ARIA labeling.
- Achieve Lighthouse scores above 90 for PWA, Performance, Accessibility, and Best Practices.
- Create regression checklist and demo seed data script.

**Acceptance Criteria**
- Accessibility and performance audits pass.
- Documentation is comprehensive for onboarding and QA.

**NEXT:** Public launch and ongoing iteration.

## Seed Data (Optional — Development Only)
Create `/sql/migrations/999_seed_dev.sql` for local/demo environments. **Never deploy to production.**
```sql
insert into public.challenges (title, cadence, rule, points_reward)
values
('Save $5 today', 'daily', '{"type":"deposit_at_least","cents":500}', 25),
('No-spend week', 'weekly', '{"type":"no_spend_category","category":"Eating Out"}', 100);

insert into public.badges (id, name, description, icon, threshold)
values
('first-deposit','First Deposit','Made your very first deposit','🎉',1),
('streak-7','Hot Streak','7 days in a row','🔥',7),
('points-1000','Level Up','Earned 1000 points total','⭐',1000);

insert into public.tips (title, content, points_reward) values
('Automate tiny deposits', 'Set $2/day auto-save to build habit.', 10),
('Name your goal', 'Specific goals increase success rate.', 10);
```

## Security & RLS Checklist
- Enable RLS on every user-data table.
- Restrict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations to the authenticated user via `auth.uid()` checks (or equivalent joins).
- Use the Supabase anon key in the client; never expose the service key in code or configuration.

## Initial GitHub Issues
Create the following GitHub issues to mirror each implementation step:
1. Setup: Vite React TS + PWA + GH Pages (Step 0)
2. Auth + Profiles + RLS (Step 1)
3. Goals + Deposits + Progress UI (Step 2)
4. Streak Engine (Step 3)
5. Points & Badges (Step 4)
6. Challenges (Step 5)
7. Budgets & Categories (Step 6)
8. Leaderboard (opt-in) (Step 7)
9. Playful UI pass (Step 8)
10. PWA offline + queue (Step 9)
11. Settings & in-app reminders (Step 10)
12. Tips/Lessons (Step 11)
13. A11y/Perf/Docs (Step 12)

## Worklog Template
Every step should document progress in `/docs/worklog/STEP-<nn>.md` using:
```markdown
# STEP <nn>: <title>
## Goal

## Changes
- 

## SQL
- 

## Testing
- 

## Screens
- 

## NEXT
- 
```

Keep this roadmap updated if priorities shift or new insights emerge.
