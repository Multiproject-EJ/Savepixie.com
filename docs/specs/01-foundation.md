# Step 0 Spec — Initialize Repo & Tooling

## Goal
Bootstrap the SavePixie project with a Vite + React + TypeScript PWA, Supabase client wiring, and GitHub Pages deployment so future steps can build on a working foundation.

## Scope
- Project scaffolding with routing placeholders for `/`, `/auth`, and `/dashboard`.
- PWA manifest and basic service worker that caches the application shell.
- Supabase client configured from environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Repository configuration (`.editorconfig`, Prettier, optional CI) and `.env.example` with documented variables.
- GitHub Actions workflow to build and deploy to GitHub Pages (custom domain `savepixie.com`).

## Deliverables
- Vite project initialized with React + TS entrypoint.
- Routing structure and placeholder pages.
- PWA assets (`public/manifest.webmanifest`, icons directory) and `src/service-worker.ts` (or equivalent) registered.
- Supabase helper in `src/lib/supabase.ts`.
- Tooling/formatting configs and environment template.
- `.github/workflows/deploy.yml` configured for Pages deployment.
- Updated documentation (`README.md`, this spec, worklog entry once implemented).

## Acceptance Criteria
- Local development server runs without errors.
- Production build succeeds via `npm run build`.
- Deployed site loads at `https://savepixie.com` and can be installed as a PWA with offline shell.

## Notes
- Keep dependencies minimal (React Router as primary addition).
- Ensure environment variables are documented but not committed with secrets.
- After completion, continue with Step 1: Supabase Auth + Profiles.
