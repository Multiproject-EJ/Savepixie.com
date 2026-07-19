# SavePixie

SavePixie is a phone-first savings companion for solo goals and privacy-respecting shared Pacts. It is
a React/TypeScript Progressive Web App backed by Supabase Auth and PostgreSQL. SavePixie records
commitments and progress; customer money always remains in a bank account the customer controls.

## Product today

- guided onboarding creates a solo or shared Pact and a real-world Savings Home;
- daily Savings Moves teach small practical techniques and build a gentle streak, Stardust, and
  Journey history;
- the Dream Library offers starter goals, deadline-based weekly pace, milestones, and contribution
  history;
- shared Circles expose only privacy-filtered progress and activity, with aggregate one-tap cheers;
- weekly planning keeps available, committed, and saving amounts understandable;
- account settings include Savings Home editing, portable JSON export, Stripe billing status, and
  password-confirmed account deletion;
- the installable PWA includes direct-route fallback, offline shell, update prompts, and phone/desktop
  layouts.

The Account Check screen is an explicitly labelled prototype. It must remain in sample mode until a
real provider, attribution, freshness, retention, and paid-report agreement exist.

## Local development

```bash
npm install
npm run dev
```

The development server opens on `http://localhost:5173`. Use `npm run build` for the complete
TypeScript and production-bundle check, and `npm run preview` to serve the built PWA locally.

## Stack and deployment

- Client: Vite, React, and TypeScript.
- Hosting: GitHub Pages deployed from `main`.
- Backend: the shared EU `WalletHabit Suite` Supabase project.
- Billing: Stripe-hosted Checkout and Billing Portal through protected Supabase Edge Functions.
- Database source: `supabase/migrations/`; rollback-safe acceptance suites live in `supabase/tests/`.
- Public configuration: `.env.example`. Never put service-role, Stripe secret, SMTP, or other private
  credentials in the client or a `VITE_` value.

## Useful routes

- `/` — public landing page
- `/auth` — sign in, sign up, confirmation, recovery, and password update
- `/app/today` — daily Savings Move
- `/app/goals` — solo/shared Pacts and Dream Library
- `/app/plan` — weekly plan
- `/app/journey` — streaks, techniques, milestones, and history
- `/app/settings` — account, data, Savings Home, and billing controls
- `/preview/app` — non-persistent product preview
- `/legal/terms` and `/legal/privacy` — closed-beta legal drafts

## Safety model

- RLS is enabled on every customer-data table.
- Money-moving records are append-only and written through protected database functions.
- Reported progress and bank-verified progress remain visibly separate.
- Shared exact amounts follow each member's privacy choice; Savings Homes and private notes are never
  shared with a Circle.
- Stripe subscription revenue can never count as customer savings.
- Account export and deletion include daily-loop and Circle-reaction data.

## Production handoff

Start with:

- `docs/production/LAUNCH-READINESS.md` for the authoritative release gates;
- `docs/production/DOMAIN-CUTOVER.md` for DNS and rollback;
- `docs/production/EMAIL-DELIVERY.md` for SMTP and Auth templates;
- `docs/production/STRIPE-SETUP.md` for billing acceptance;
- `docs/production/ACCOUNT-DELETION.md` for the irreversible account flow.

The older documents in `docs/specs/` and `sql/migrations/` remain implementation history, not the
production source of truth.
