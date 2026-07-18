# SavePixie Supabase and RLS Audit

Status: shared production foundation installed and live authorization tests passed
Verified: 2026-07-18

## Production project

- Project: `WalletHabit Suite`
- Project reference: `iuqgfpcsaclbaveamhvg`
- Region: `eu-west-1`
- Postgres: 17
- Intended products: SavePixie and WalletHabit
- Shared resources: authentication, customer profiles, Stripe customer mapping, and the savings
  ledger
- Product-specific resource: subscription entitlements keyed by `product_key`

The older `WalletHabit.com` project remains inactive and was not changed. `LifeGoalApp.com` is an
unrelated product and was not inspected or changed as part of this setup.

## Applied migrations

1. `harden_savings_ledger`
2. `add_suite_billing_entitlements`
3. `clarify_service_tables_and_goal_owner_index`

The corresponding source files live in `supabase/migrations/`.

## Verified controls

- RLS is enabled on every exposed application table.
- `anon` has no access to private saving or billing data.
- Authenticated users can access only their own profile, goals, events, and entitlement summaries.
- Goal/event ownership is enforced with a composite foreign key.
- Deposits are append-only and update the goal balance atomically through
  `record_goal_deposit` and a private trigger.
- Normal clients cannot directly update `goals.saved_cents`, rewrite event history, or grant paid
  access.
- Pact members receive column-level update permission only for their own `commitment_cents` and
  `privacy_mode`; protected membership identity, Pact, role, status, and timestamp columns are not
  writable by authenticated clients.
- Stripe customer mappings and webhook idempotency records are service-only.
- SavePixie and WalletHabit entitlements are independent rows keyed by both user and product.
- The browser uses a modern publishable key; no service-role or Stripe secret enters the PWA.
- Supabase Security Advisor reports one Auth warning: leaked-password protection is disabled. No
  database, RLS, function, or exposed-schema vulnerability is reported.
- The only Performance Advisor notices are unused-index informational notices on an empty database.

## Live rollback test

A transactional test created two temporary users and verified that:

1. User A could create and read User A's profile and goal.
2. User A could not see User B's profile or SavePixie entitlement.
3. User A could not add a deposit to User B's goal.
4. `record_goal_deposit` added an event and changed the saved balance together.
5. User A could not directly rewrite the saved balance.
6. User A could not insert a paid entitlement.

The test ended with `ROLLBACK`. A follow-up count confirmed zero auth users, profiles, goals,
events, and entitlements remained.

## Remaining backend work

- Configure SavePixie auth site URL, redirect URLs, email templates, and production SMTP.
- Enable leaked-password protection in Supabase Auth and re-run the Security Advisor.
- Add the public project URL and publishable key to the GitHub deployment variables.
- Generate and commit database TypeScript types. The first generation request returned an
  `exceed_db_size_quota` restriction even though the new database reports only 10 MB and accepts
  normal queries; verify organization usage in the Dashboard before retrying.
- Add a concurrency test proving simultaneous deposits cannot lose an update.
- Test auth from the deployed domain, including confirmation and password reset.
- Configure Stripe only after the product, price, webhook secret, and acceptance tests are ready.

## Official references

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api
- Project regions: https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z
- Data API exposure change:
  https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
