# SavePixie Launch Readiness

Updated: 2026-07-18

## Current release boundary

SavePixie is preparing for a closed customer beta. The interface, PWA shell, authentication client,
solo/shared Savings Pact schema, Savings Homes, pending/verified ledger, secure invitations, synced
weekly plans, onboarding, and Account Check prototype exist. The expanded client is being prepared for
deployment. Real payments, real bank verification, and real Account Check recommendations remain
disabled until their server-side dependencies and customer safeguards pass the gates below.

## Gate 1 — shared suite production backend

- [x] Create the shared WalletHabit Suite Supabase project in `eu-west-1`.
- [x] Apply the savings-ledger, suite-entitlement, and advisor-remediation migrations.
- [x] Configure the SavePixie site URL and allowed auth redirect URLs.
- [x] Configure the production build with the public Supabase URL and publishable browser key.
- [x] Confirm Data API exposure and explicit grants for each public table and function.
- [x] Generate database TypeScript types from the live project and wire them into the client.
- [x] Run Supabase security and performance advisors with no unresolved launch blocker.

## Gate 2 — security verification

- [x] User A can read and mutate only User A's profile and goals.
- [x] User B cannot use a disclosed UUID to read or mutate User A's records.
- [x] An unauthenticated client has no grants on private saving data.
- [x] A cross-owner goal event is rejected by RLS and the composite ownership relationship.
- [x] Concurrent deposits both contribute to the final balance without a lost update.
- [x] A failed deposit leaves neither an event nor a changed balance.
- [x] Normal clients cannot directly change `saved_cents`, update history, or delete history.
- [x] Shared Pact members cannot discover another member's Savings Home or private exact entries.
- [x] Circle summaries enforce exact, on-track-only, and organiser-only member visibility in SQL.
- [x] Pact invitations expire, require authentication, and cannot expose non-member Pact data.
- [x] Verified allocations cannot exceed the linked Savings Home's verified balance.
- [x] Weekly plans are isolated by user and cannot be read or written across accounts.
- [x] Leaving a Pact preserves ledger history, removes access, and supports controlled reactivation.
- [x] Authenticated Pact members cannot promote themselves, change membership identity, or move their
      membership to another Pact; only commitment and privacy columns are client-writable.
- [x] Self-service deletion requires password reconfirmation and refuses to orphan an active Stripe
      subscription.
- [x] Account deletion transfers active shared Pacts, repairs their totals, and preserves remaining
      members' history.
- [ ] Enable Supabase leaked-password protection and clear the remaining Auth Security Advisor
      warning.

## Gate 3 — web deployment

- [x] Capture the current AlphaStocks forwarding chain, authoritative DNS, exact GitHub Pages records,
      acceptance checks, and rollback values in `DOMAIN-CUTOVER.md`.
- [ ] Point `savepixie.com` and `www.savepixie.com` to the selected GitHub Pages deployment.
- [ ] Confirm HTTPS and canonical-host redirects.
- [ ] Confirm direct-route refreshes use the generated `404.html` SPA fallback.
- [x] Verify the production offline shell for `/` and a direct `/auth` route with the server unavailable.
- [x] Ship and build-verify 192 px, 512 px, maskable Android, and Apple touch install icons.
- [x] Add foreground update checks and an explicit customer refresh prompt for installed PWAs.
- [ ] Test PWA installation and update behavior on a physical phone, plus password reset and email
      confirmation on the real domain.
- [ ] Configure production SMTP, branded confirmation/recovery templates, sender authentication, and
      delivery monitoring.
- [x] Record the existing Mailgun DNS, shared Supabase sender, observed email-rate-limit failure, safe
      SMTP procedure, and external acceptance suite in `EMAIL-DELIVERY.md`.
- [ ] Add production error monitoring and a minimal privacy-respecting analytics funnel.
- [ ] Deploy and test the new Pact client against production authentication with two real beta accounts.
- [x] Confirm production-origin CORS for authenticated browser functions.
- [x] Add recoverable session and initial private-data loading states, and defer database calls outside
      the Supabase auth-state callback.

## Gate 4 — paid product

- [x] Prepare local entitlement, Checkout, Portal, signed-webhook, and idempotency infrastructure.
- [x] Deploy dormant Checkout, Portal, and signed-webhook function shells.
- [x] Define and enforce the first Pro boundary: additional shared Pacts and larger family/group
      Circles, without removing existing data when Pro ends.
- [ ] Create Stripe product, price, seven-day trial, and tax configuration.
- [x] Create and deploy authenticated server-side Checkout and customer-portal sessions behind the
      production feature flag.
- [x] Recheck Stripe customer ownership in Checkout/Portal, bind subscription webhooks to the private
      customer mapping, and probe the deployed anonymous/unsigned rejection boundary.
- [x] Scan the tracked launch tree for Stripe, SMTP, Mailgun, Supabase secret, service-role value, and
      secret-bearing `VITE_` patterns; only SQL role names remain and no credential value is present.
- [ ] Verify Stripe webhooks, store webhook IDs for idempotency, and derive entitlements server-side.
- [ ] Complete upgrade, cancellation, failed-payment, refund, and restore-purchase flows.
- [x] Add an honest feature-flagged Settings offer with first-trial and returning-customer copy.
- [ ] Test the full Stripe lifecycle in test mode before switching on live mode.

## Gate 5 — customer safeguards

- [ ] Legally review and publish the drafted Terms, Privacy Policy, subscription terms, and
      refund/cancellation copy after adding the operator identity and jurisdiction.
- [x] Add self-service account deletion, a private data export, and a support contact.
- [x] Trap and restore focus, support Escape, lock background scrolling, and prevent accidental closure
      during saving or destructive modal actions.
- [ ] Finalize legally required billing retention and automate retention for future server-side
      Account Check reports.
- [ ] Keep customer savings outside SavePixie; the app records commitments and verified balances only.
- [ ] Keep Pixie Account Check in sample mode until the real provider agreement, attribution, data
      freshness, completeness, monitoring, and paid-report rules are verified.

## First launch target

Launch a closed beta to 10–20 adults after Gates 1–3 pass. Enable Stripe for those customers only after
Gate 4 passes and the Pro feature delivers recurring value. Treat the one-time Account Check as a later
paid add-on rather than a dependency for the first subscription beta.
