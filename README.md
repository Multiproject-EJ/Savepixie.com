# SavePixie

SavePixie is a mobile-first personal savings coach delivered as a static Progressive Web App (PWA). The client is built with Vite, React, and TypeScript, and all backend capabilities (authentication, database, and row-level security) are provided by Supabase.

This repository tracks both the full development plan and the implementation of the SavePixie
application. The project is bootstrapped with Vite, React, and TypeScript and includes a PWA shell so
future roadmap steps can build on a working foundation.

## Local Development

```bash
npm install
npm run dev
```

The development server is available on http://localhost:5173 and automatically reloads as you edit
files in `src/`.

To produce a production build run:

```bash
npm run build
npm run preview
```

This command checks TypeScript types and outputs the static bundle in `dist/`.

## PWA Shell

- `public/manifest.webmanifest` describes the installable app metadata and references generated icons
  in `public/icons/`.
- `src/service-worker.ts` caches the application shell so the router and core assets load offline.
- The service worker is registered from `src/main.tsx` once the page is loaded.

## Authentication & Profiles (Step 1)

- Password-based sign-in, sign-up, and password reset flows live at `/auth` and are powered by Supabase
  Auth.
- `src/app/AuthProvider.tsx` exposes the current session and helpers for signing in, signing up, signing
  out, and requesting password resets while ensuring the `profiles` table is upserted after first login.
- `src/app/ProtectedRoute.tsx` guards private routes like `/dashboard`, redirecting anonymous visitors to
  the auth page and preserving their original destination.
- Profile bootstrapping happens through `src/features/profile/api.ts`, which writes the default
  `display_name`, `username`, and `avatar_url` for the authenticated user.

## Savings Goals & Deposits (Step 2)

- `/dashboard` now surfaces a goals workspace where you can create personalized savings goals with emoji
  accents, colors, target amounts, and optional deadlines.
- The `src/features/goals/api.ts` helpers load, create, and update Supabase goals alongside their deposit
  events while keeping optimistic UI updates in sync.
- Rich dashboard styling (`src/styles/global.css`) introduces progress rings, summary stats, and modals
  for the "New goal" and "Record deposit" flows.
- SQL migration `sql/migrations/002_goals.sql` provisions the `goals` and `goal_events` tables secured by
  row level security policies tied to the authenticated Supabase user.

## Guiding Codex Through the Plan
To have Codex implement the product incrementally, reference the roadmap step you want to tackle and ask Codex to begin that
step. Example prompt:

> "Let's start with Step 1 from the SavePixie roadmap. Please follow the documented tasks and update the worklog when you're
> done."

Codex can then consult [`docs/specs/roadmap.md`](docs/specs/roadmap.md) for the detailed requirements, deliver the code, and
record progress in `docs/worklog/`. Repeat this pattern for each subsequent step (Step 2, Step 3, etc.).

## Stack & Hosting
- **Hosting:** GitHub Pages (static deploy from `main`).
- **Client:** Vite + React + TypeScript, PWA-first.
- **Backend:** Supabase Auth + Postgres with strict Row Level Security (RLS).
- **Environment:** `.env.example` will expose `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (do not commit secrets).

## Repository Structure
```
savepixie/
├── CNAME
├── README.md
├── docs/
│   ├── specs/
│   │   ├── roadmap.md
│   │   └── .gitkeep
│   └── worklog/
│       └── .gitkeep
├── sql/
│   └── migrations/
│       └── .gitkeep
└── src/
    ├── app/
    │   └── .gitkeep
    ├── assets/
    │   └── .gitkeep
    ├── components/
    │   └── .gitkeep
    ├── features/
    │   └── .gitkeep
    ├── lib/
    │   └── .gitkeep
    ├── pages/
    │   └── .gitkeep
    └── styles/
        └── .gitkeep
```

As implementation progresses, each directory will be populated with application code, assets, SQL migrations, and documentation.

## Development Roadmap
The full step-by-step roadmap (including goals, tasks, SQL migrations, acceptance criteria, and "what's next" notes) lives in [`docs/specs/roadmap.md`](docs/specs/roadmap.md). Each numbered step is intended to become its own feature branch, pull request, and tagged release.

## Worklog Template
For every completed step, create a worklog entry in `docs/worklog/STEP-<nn>.md` following the template provided at the bottom of the roadmap document. This ensures we capture the goal, changes, SQL, testing notes, screenshots, and next actions for each iteration.

## GitHub Issues & Iteration Rhythm
Create GitHub issues #1–#13 to mirror Steps 0–12. For each step:
1. Branch from `dev` using `feature/<step-number>-<short-name>`.
2. Implement the tasks and SQL migrations for that step.
3. Commit changes with conventional commit messages.
4. Open a pull request that references the issue and includes the required template sections (Goal / Changes / SQL / Testing / Screens / NEXT).
5. Merge into `dev`, then into `main` when ready to deploy, and tag the release (`v0.x.y`).
6. Update the roadmap/worklog and open the next issue.

## Security & RLS Principles
- Enable RLS on every Supabase table that stores user data.
- Use `auth.uid()` checks (or equivalent joins) to restrict CRUD operations to the owning user.
- Never expose the Supabase service role key in the client or repository.

Stay tuned as we build on **Step 1 — Supabase Auth + Profiles** and beyond.
