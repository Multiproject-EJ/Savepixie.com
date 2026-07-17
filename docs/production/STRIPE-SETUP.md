# SavePixie Stripe Setup

Updated: 2026-07-17  
Status: Edge Function shells deployed; no live product, Stripe keys, webhook endpoint, or payment activation

## Commercial boundary

SavePixie Pro is planned as a 29 NOK monthly subscription with a plainly disclosed seven-day trial.
Stripe revenue belongs to SavePixie. Customer savings are never collected, pooled, held, or moved by
Stripe or SavePixie.

The conversion screen and public upgrade action remain disabled until the paid feature and final copy
are approved. The deployed functions remain dormant until Stripe test-mode secrets are configured.

## Deployed components

- `create-checkout-session` verifies the signed-in Supabase user and creates a Stripe-hosted
  subscription Checkout Session.
- `create-portal-session` verifies the user and creates a short-lived Stripe Billing Portal Session.
- `stripe-webhook` is intentionally configured with `verify_jwt = false`; it verifies the raw request
  body with `STRIPE_WEBHOOK_SIGNING_SECRET` before accepting an event.
- `billing_customers` maps one Supabase user to one Stripe customer.
- `entitlements` is a minimal, user-readable summary derived from verified subscription webhooks,
  keyed by both user and product so SavePixie and WalletHabit access remain independent.
- `stripe_webhook_events` and `process_stripe_subscription_event` make webhook processing idempotent
  and transactional.

The Edge Functions pin Stripe SDK `22.3.2`, whose default API version is `2026-06-24.dahlia`, and
Supabase JavaScript SDK `2.75.0`.

## Required Supabase secrets

Set these only on the dedicated SavePixie project:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SIGNING_SECRET`
- `STRIPE_SAVEPIXIE_PRO_PRICE_ID`
- `SITE_URL=https://savepixie.com`
- `SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to deployed Supabase Edge Functions. The
service-role value must never be added to GitHub Pages variables or any `VITE_` value.

## Stripe Dashboard configuration

1. Create a SavePixie Pro product and a recurring monthly price in NOK for 29 kr.
2. Configure the Billing Portal for payment-method updates and cancellation.
3. Add the deployed `stripe-webhook` URL as a webhook endpoint using API version
   `2026-06-24.dahlia`.
4. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the endpoint signing secret into the Supabase project secret.

## Test-mode acceptance

- A signed-out request cannot create Checkout or Portal sessions.
- A signed-in free user receives a Stripe-hosted Checkout URL.
- Checkout displays the 29 kr monthly price and seven-day trial before confirmation.
- Successful Checkout creates `trialing` access only after the signed webhook is processed.
- Replaying the same webhook event does not apply the update twice.
- Invalid signatures are rejected without writing database records.
- Portal cancellation changes access only after the corresponding subscription webhook.
- Failed, past-due, canceled, incomplete, and expired subscriptions do not retain Pro access.
- Stripe test clocks cover trial end, successful renewal, failed renewal, and cancellation.

## Activation sequence

The migrations and three function shells are deployed. Next, set test-mode secrets, configure the
Stripe webhook and portal, then run the acceptance suite. Only after the conversion screen and paid
feature are approved should the frontend call `createCheckoutSession()` from a visible upgrade
action.
