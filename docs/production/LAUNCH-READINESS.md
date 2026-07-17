# SavePixie Launch Readiness

Updated: 2026-07-17

## Current release boundary

SavePixie is preparing for a closed customer beta. The interface, PWA shell, authentication client,
goals, deposits, onboarding, and Account Check prototype exist. Real payments and real Account Check
recommendations remain disabled until their server-side dependencies and customer safeguards pass the
gates below.

## Gate 1 — shared suite production backend

- [x] Create the shared WalletHabit Suite Supabase project in `eu-west-1`.
- [x] Apply the savings-ledger, suite-entitlement, and advisor-remediation migrations.
- [ ] Configure the SavePixie site URL and allowed auth redirect URLs.
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as GitHub repository variables.
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

## Gate 3 — web deployment

- [ ] Point `savepixie.com` and `www.savepixie.com` to the selected GitHub Pages deployment.
- [ ] Confirm HTTPS and canonical-host redirects.
- [ ] Confirm direct-route refreshes use the generated `404.html` SPA fallback.
- [ ] Test PWA installation, update behavior, offline shell, password reset, and email confirmation.
- [ ] Add production error monitoring and a minimal privacy-respecting analytics funnel.

## Gate 4 — paid product

- [x] Prepare local entitlement, Checkout, Portal, signed-webhook, and idempotency infrastructure.
- [x] Deploy dormant Checkout, Portal, and signed-webhook function shells.
- [ ] Finalize the 29 kr/month Pro entitlement and its first unmistakable paid feature.
- [ ] Create Stripe product, price, seven-day trial, and tax configuration.
- [ ] Create authenticated server-side checkout and customer-portal sessions.
- [ ] Verify Stripe webhooks, store webhook IDs for idempotency, and derive entitlements server-side.
- [ ] Complete upgrade, cancellation, failed-payment, refund, and restore-purchase flows.
- [ ] Test the full Stripe lifecycle in test mode before switching on live mode.

## Gate 5 — customer safeguards

- [ ] Publish reviewed Terms, Privacy Policy, subscription terms, and refund/cancellation copy.
- [ ] Add account deletion, data export, retention automation, and a support contact.
- [ ] Keep customer savings outside SavePixie; the app records commitments and verified balances only.
- [ ] Keep Pixie Account Check in sample mode until the real provider agreement, attribution, data
      freshness, completeness, monitoring, and paid-report rules are verified.

## First launch target

Launch a closed beta to 10–20 adults after Gates 1–3 pass. Enable Stripe for those customers only after
Gate 4 passes and the Pro feature delivers recurring value. Treat the one-time Account Check as a later
paid add-on rather than a dependency for the first subscription beta.
