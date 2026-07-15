# SavePixie Supabase and RLS Audit

Status: local repository audit complete; live SavePixie project verification pending  
Audited: 2026-07-15

## Scope

This audit covers:

- the Supabase browser client;
- authentication and profile creation;
- `profiles`, `goals`, and `goal_events` migrations;
- frontend goal and deposit queries;
- environment-variable handling;
- deployment configuration;
- the Supabase projects currently visible through the connected account.

No live database changes were made during this audit.

## Remote-project finding

The connected Supabase account currently exposes two projects:

- `LifeGoalApp.com` — active, but its `goals` and `profiles` schemas do not match SavePixie;
- `WalletHabit.com` — inactive and unavailable during the audit.

There is no identifiable SavePixie project in the connected account. The SavePixie migrations must not be applied to either visible project. Live policy tests, database advisors, grants, and migration history therefore remain unverified until the correct project is connected or created.

## Controls that are already good

- RLS is enabled in the repository migrations for all three exposed tables.
- Every existing policy compares the authenticated user ID with an ownership column.
- The frontend contains no service-role key, secret key, database password, or private Stripe credential.
- `.env` and local environment variants are ignored by Git; only `.env.example` is tracked.
- The frontend selects explicit columns instead of using `select('*')`.
- User metadata is used only to seed display profile fields, not for authorization.
- Goals and profiles reference `auth.users` with cascading cleanup.

## Required remediation

### P0 — identify and connect the correct project

Before any schema change:

1. identify or create the dedicated SavePixie Supabase project;
2. confirm its project reference and region;
3. compare live tables, policies, grants, functions, and migration history with this repository;
4. run both security and performance advisors;
5. test policies as two different authenticated users plus an unauthenticated client.

### P0 — make deposits transactional and concurrency-safe

`recordDeposit` currently performs two separate browser requests:

1. insert a `goal_events` row;
2. calculate and write a replacement `goals.saved_cents` value.

This can leave an event without updated goal progress if the second request fails. Two deposits made close together can also calculate from the same old balance and overwrite one another.

Replace this with one database transaction. The preferred first implementation is an insert-only event flow with a database trigger that atomically increments the owned goal. The browser should not receive general permission to rewrite `saved_cents` directly.

### P0 — enforce goal/event ownership at the database relationship

The `goal_events` policy checks that the event's `user_id` is the current user, but the foreign key only checks that `goal_id` exists. It does not prove that the referenced goal belongs to the same user.

Add a database-enforced relationship between `(goal_id, user_id)` and `goals(id, user_id)`. This closes the cross-owner reference gap even if a goal UUID is ever disclosed.

### P1 — constrain monetary values in the database

The frontend rejects non-positive deposits, but a client can call the Data API directly. Add database checks appropriate to the supported product behaviour:

- `goal_events.delta_cents > 0` while the product supports deposits only;
- `goals.saved_cents >= 0`;
- reasonable upper bounds if product research shows they are needed;
- a later explicit adjustment or withdrawal event type instead of accepting arbitrary negative deltas.

### P1 — split and scope RLS policies

The current `FOR ALL` policies are compact but hard to audit. Replace them with explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies as required by the product.

Each policy should:

- use `TO authenticated`;
- use `(select auth.uid())` for the ownership comparison;
- include both `USING` and `WITH CHECK` on updates;
- omit operations the browser does not need;
- keep event history append-only unless a specific correction workflow is approved.

### P1 — verify grants and Data API exposure

RLS and object grants are separate controls. On the actual project, explicitly verify that:

- `anon` has no table privileges for private saving data;
- `authenticated` has only the operations used by the app;
- the tables are exposed to the Data API if the browser client is meant to access them;
- any helper functions have `EXECUTE` revoked from roles that do not need them.

New Supabase projects can be configured not to expose `public` tables automatically, so migration and deployment checks must cover both grants and RLS.

### P1 — add ownership indexes

Add indexes for the columns used by policies and relationships:

- `goals(user_id)`;
- `goal_events(user_id)`;
- `goal_events(goal_id)`;
- the composite key needed for `(goal_id, user_id)` ownership enforcement.

### P1 — make profile creation race-safe

`ensureProfile` performs a read followed by an insert. Multiple auth callbacks can race and make one request fail on the primary key. Use an idempotent upsert or a database-side new-user profile trigger after its permissions and failure behaviour are reviewed.

### P2 — use the modern publishable key name

The app currently expects `VITE_SUPABASE_ANON_KEY`. Supabase now recommends publishable keys for new applications. Move to a neutral variable such as `VITE_SUPABASE_PUBLISHABLE_KEY`, retain temporary compatibility only if the live project still uses a legacy anon key, and never place a secret or service-role key in a `VITE_` variable.

### P2 — pin the client dependency

`@supabase/supabase-js` is declared with a caret range while the lockfile currently resolves a newer exact version. Pin the intended package version and keep the lockfile committed so authentication behaviour does not drift between deployments.

### P2 — fix deployment environment injection

The GitHub Pages workflow does not currently pass Supabase URL or publishable-key variables to the Vite build. Confirm the intended deployment surface and inject only public build-time values through protected GitHub variables or secrets. Keep all server credentials outside the static build.

## Required verification tests

Run these against a disposable development branch or local Supabase instance before production:

1. User A can create, read, and update only User A's profile and goals.
2. User B cannot read or change User A's rows even when exact UUIDs are supplied.
3. An unauthenticated request cannot read or mutate any private table.
4. User B cannot insert an event referencing User A's goal.
5. A deposit creates its event and increments the goal in one transaction.
6. Two simultaneous deposits both contribute to the final balance without a lost update.
7. A failed deposit leaves neither a partial event nor a partial balance change.
8. Negative and zero deposits are rejected by the database.
9. Event history cannot be rewritten or deleted by a normal client.
10. Security and performance advisors return no unresolved issue for the changed objects.

## Stripe boundary for the later monetisation phase

Stripe must remain server-authoritative:

- checkout and customer-portal sessions are created by an authenticated server or Edge Function;
- Stripe secret keys and webhook signing secrets never enter the PWA bundle;
- webhook event IDs are stored for idempotency;
- subscription and trial status is derived from verified webhooks, not client claims;
- a seven-day trial is stated plainly before checkout and represented consistently in Stripe, the app, and cancellation copy;
- RLS allows users to read only their own entitlement summary and never to grant themselves paid access.

The final pricing and conversion screen will be designed after reviewing the user's reference video.

## Official references

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api
- Secure data overview: https://supabase.com/docs/guides/database/secure-data
- April 2026 Data API exposure change: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
