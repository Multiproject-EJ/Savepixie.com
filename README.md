# SavePixie

SavePixie is a mobile-first personal savings coach delivered as a static Progressive Web App (PWA). The client is built with Vite, React, and TypeScript, and all backend capabilities (authentication, database, and row-level security) are provided by Supabase.

This repository currently documents the full development plan so we can implement the product step by step.

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

Stay tuned for implementation starting with **Step 0 — Initialize Repo & Tooling**.
