# SavePixie Payments: Demo to Live

Updated: 2026-07-20

## Current mode

SavePixie is in **demo mode**. The app displays the intended Pro offer, but a new customer cannot open
Checkout or enter a card. `.env.production` and the GitHub Actions fallback both keep
`VITE_STRIPE_ENABLED=false`.

The switch is fail-closed: only the exact string `true` enables new Checkout sessions in the client.
Existing subscribers can still open the Stripe Billing Portal when new sales are switched off, so a
temporary sales pause never removes their ability to manage or cancel.

## One-time live preparation

Complete these once before the first real customer:

1. Finish the Stripe account identity, tax registration, product tax code, and inclusive/exclusive
   treatment of the displayed 29 kr price.
2. Create the live SavePixie Pro product and exact 29 NOK monthly price.
3. Create a live webhook for the deployed `stripe-webhook` function with the four documented events.
4. Configure the live Billing Portal with payment-method updates, cancellation, and the reviewed
   SavePixie Terms and Privacy links.
5. Replace the Supabase Edge Function billing secrets with the live secret key, webhook signing
   secret, and live SavePixie price ID.
6. Run one live low-value owner purchase, cancellation, entitlement, and refund check, then remove the
   owner test subscription.

Private Stripe keys stay only in Supabase. Never place them in GitHub variables or any `VITE_` value.

## The public launch switch

After the one-time preparation passes:

1. Set the GitHub Actions repository variable `VITE_STRIPE_ENABLED` to `true`.
2. Re-run the SavePixie deployment or merge the release commit.
3. Confirm Settings offers **Start 7-day free trial**, Checkout shows 29 NOK monthly after seven free
   days, and the return route reaches `/app/today`.

That repository variable is the only customer-facing sales switch. No application rebuild or code
change is required beyond the automatic deployment.

## Emergency sales pause

Set `VITE_STRIPE_ENABLED=false` and redeploy. New Checkout stays closed, while signed-in customers
with an existing subscription retain access to **Manage billing**. Do not delete Stripe products,
prices, webhooks, customers, or Supabase entitlement rows during a pause.

The detailed technical evidence and refund procedure remain in `STRIPE-SETUP.md`.
