# SavePixie Stripe Setup

Updated: 2026-07-20
Status: Complete sandbox lifecycle verified; demo mode remains fail-closed while tax, legal, and
live-mode account preparation remain gated

## Commercial boundary

SavePixie Pro is planned as a 49 NOK monthly subscription with a plainly disclosed seven-day trial.
Stripe revenue belongs to SavePixie. Customer savings are never collected, pooled, held, or moved by
Stripe or SavePixie.

The paid boundary is now real and enforced by PostgreSQL:

- Basic keeps unlimited solo saving and one active shared Pact with one companion.
- Pro unlocks additional shared Pacts and family/group Circles of up to ten savers.
- A Basic saver participates in one active shared Pact even when its organiser has Pro.
- Ending Pro never deletes, hides, or removes an existing Pact or member; it prevents only new
  Pro-sized creation or joining.

The Settings offer shows the planned price as demo pricing and prevents a new Checkout while
`VITE_STRIPE_ENABLED=false`. Existing subscribers can still open the Billing Portal during a sales
pause. The short launch and rollback procedure is in `PAYMENTS-GO-LIVE.md`.

## Deployed components

- `create-checkout-session` verifies the signed-in Supabase user and creates a Stripe-hosted
  subscription Checkout Session. It rejects any configured price that is not an active recurring
  49 NOK monthly price and grants the seven-day trial only when no prior SavePixie entitlement exists.
- `create-portal-session` verifies the user and creates a short-lived Stripe Billing Portal Session.
- Checkout re-retrieves any mapped Stripe customer before reuse; a deleted customer is replaced and a
  customer whose immutable SavePixie user metadata does not match is rejected. Portal performs the
  same ownership check and refuses deleted or mismatched customers.
- `stripe-webhook` is intentionally configured with `verify_jwt = false`; it verifies the raw request
  body with `STRIPE_WEBHOOK_SIGNING_SECRET` before accepting an event.
- `billing_customers` maps one Supabase user to one Stripe customer.
- `entitlements` is a minimal, user-readable summary derived from verified subscription webhooks,
  keyed by both user and product so SavePixie and WalletHabit access remain independent.
- `stripe_webhook_events` and `process_stripe_subscription_event` make webhook processing idempotent
  and transactional.
- The webhook refuses to grant SavePixie Pro when the subscription item does not match the configured
  SavePixie price ID.
- Subscription events resolve their owner from the private `billing_customers` mapping and reject any
  conflicting metadata UUID. Completed Checkout events must be subscription-mode events for a
  recognized suite product before they may update that mapping.

The Edge Functions pin Stripe SDK `22.3.2`, whose default API version is `2026-06-24.dahlia`, and
Supabase JavaScript SDK `2.75.0`.

## Required Supabase secrets

Set these only on the shared WalletHabit Suite project used by SavePixie:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SIGNING_SECRET`
- `STRIPE_SAVEPIXIE_PRO_PRICE_ID`
- `SITE_URL=https://savepixie.com`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to deployed Supabase Edge Functions. The
deployed runtime also provides `SUPABASE_ANON_KEY`, which the user-authenticated functions use as the
fallback client key; Supabase reserves the `SUPABASE_` prefix, so no duplicate custom publishable-key
secret is required. The service-role value must never be added to GitHub Pages variables or any
`VITE_` value.

## Stripe Dashboard configuration

1. The legacy SavePixie Pro sandbox price is 29 NOK. Replace its configured price ID with an active
   recurring 49 NOK monthly price before testing or enabling the new offer.
2. The test-mode Billing Portal permits payment-method updates and cancellation at period end.
   It carries the SavePixie headline plus Privacy and Terms links.
3. The deployed `stripe-webhook` endpoint uses API version
   `2026-06-24.dahlia`.
4. It subscribes to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. The test secret, signing secret, approved price ID, and production site URL are set in the shared
   Supabase project.

## Test-mode acceptance

- [x] A signed-out request cannot create Checkout or Portal sessions: both deployed functions return
      `401` without an authorization header.
- [x] An unsigned webhook request returns `400` before processing.
- [x] A signed-in free user receives a Stripe-hosted Checkout URL.
- A returning customer who previously had an entitlement receives no second free trial.
- [ ] Replace the sandbox subscription price with the new 49 kr monthly target and reverify the seven-day trial before confirmation.
- [x] Successful Checkout creates `trialing` access only after the signed webhook is processed.
- [x] Replaying the same webhook event does not apply the update twice. Event
      `evt_1Tv2aoF2MDiiXhcg3uKu7TF1` was resent on 2026-07-19; the entitlement stayed trialing and the
      event ledger retained exactly one copy.
- Invalid signatures are rejected without writing database records.
- [x] A signed cancellation webhook removes access, and a terminal event for an obsolete duplicate
      subscription cannot overwrite another active subscription's entitlement.
- [x] Scheduling cancellation produced a verified `cancel_at` while preserving trial access; undoing
      it cleared `cancel_at` after the corresponding webhook and left the sandbox trial active.
- [x] A failed trial-end charge moved the subscription to `past_due`; the signed subscription webhook
      changed the matching Supabase entitlement to Free with `has_pro_access=false`.
- [x] Replacing the failed payment method and paying the open invoice returned Stripe to `active`; the
      signed webhook restored the matching Supabase entitlement to Pro.
- Basic/Pro Pact limits change only future creation and joining; existing Circle data survives.
- [x] Isolated Stripe test clocks cover trial end, a successful first payment, a following successful
      monthly renewal, failed payment, payment recovery, and cancellation. All disposable clock
      customers and Supabase users were deleted after verification.
- [x] A full sandbox refund leaves an otherwise active subscription active. Immediately cancelling
      that refunded subscription produces the signed terminal subscription event, changes the
      Supabase entitlement to Free, and preserves the customer's saving data.

## Refund operator procedure

Stripe treats returning a payment and ending a subscription as separate actions. A partial or goodwill
refund must not silently end access. When a full refund is intended to end SavePixie Pro, the operator
must:

1. refund the relevant Stripe payment;
2. cancel the matching subscription immediately;
3. confirm Stripe shows the subscription as `canceled`; and
4. confirm SavePixie shows `plan=free`, `has_pro_access=false`, and `subscription_status=canceled`.

Never edit the entitlement table manually. The signed subscription webhook remains the only authority
for granting or removing Pro access. The complete refund-and-cancel sequence was verified in the
sandbox on 2026-07-20, and its disposable clock customer and Supabase user were deleted afterward.

## Remaining tax gate

The 2026-07-19 sandbox audit found Stripe Tax status `pending`, no head-office address or default tax
code, and `tax_behavior=unspecified` on the SavePixie price. Do not enable public billing until the
operator's legal business location and required registrations are confirmed, the appropriate digital
service tax code is selected, the displayed 49 kr treatment is decided (inclusive or exclusive), and
test Checkout shows the intended tax disclosure. This decision requires the operator/accountant; it
must not be guessed in code.

## Activation sequence

The migrations, ownership-hardened functions, Settings offer, server-side Pro boundary, test-mode
secrets, webhook, and portal are deployed. A real sandbox Checkout completed on 2026-07-19 and the
verified webhook granted Pro trial access through 2026-07-26. Its success return currently reaches
`https://savepixie.com/app/today`, which will show the old site's Not Found response until the domain
cutover is complete.

Next, complete the Stripe Tax and legal-operator decisions, review the final conversion screen against
the owner's reference video, create the corresponding live-mode Stripe configuration, and complete
the domain cutover. Then follow `PAYMENTS-GO-LIVE.md`; its single repository variable activates new
customer Checkout and can pause new sales without locking existing subscribers out of the Portal.
