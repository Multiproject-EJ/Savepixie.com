# SavePixie Account Deletion

Updated: 2026-07-17

## Customer flow

1. The customer may download a JSON export from Account & Settings.
2. The deletion dialog explains that SavePixie never holds or moves bank funds.
3. The customer confirms their current password and types `DELETE`.
4. The protected `delete-account` Edge Function authenticates the bearer token and requires a sign-in
   no more than ten minutes old.
5. If Stripe has a mapped customer, Stripe is queried directly. Any active, trialling, overdue,
   unpaid, incomplete, or paused subscription blocks deletion and directs the customer to Billing.
6. Shared Pacts are prepared: an owned Pact with active members goes to its longest-standing active
   remaining member, and totals are recalculated without the deleting member's entries.
7. Supabase Auth deletes the user. Verified foreign-key cascades remove the profile, Savings Homes,
   memberships, personal Pact entries and their cheers, weekly plans, daily Move history and Stardust
   progress, legacy goals, and suite billing mapping.
8. The browser clears its local session and confirms that the SavePixie account was deleted.

## Safety boundaries

- The endpoint accepts no user ID from the browser. It acts only on the authenticated caller.
- Supabase JWT verification is enabled, and the function authenticates the user again internally.
- The canonical SavePixie and `www` origins plus the two local development origins are allow-listed.
- Anonymous POST requests are rejected by the gateway.
- The irreversible action is password-confirmed and cannot run from preview mode.
- The app has no Storage objects. If Storage is introduced later, deletion tests must cover owned
  object cleanup before it is used by customers.
- Stripe receipts and other records that must be retained for tax, accounting, disputes, or fraud
  prevention require a reviewed retention schedule before live billing is enabled.

## Proven checks

- `supabase/tests/004_prepare_account_deletion.sql` is rollback-safe and proves ownership handover,
  projection repair, deletion of the departing member's entries and daily-loop data, and survival of
  remaining history.
- All five Supabase acceptance suites pass after the account-deletion and Pro-limit migrations.
- The live security advisor reports no findings.
- The live endpoint rejects an anonymous POST with `401`.
- A production-origin preflight returns `204` and `Access-Control-Allow-Origin:
https://savepixie.com`.

## Test still required before public launch

Use a disposable authenticated beta account to exercise the complete browser flow. Test no-subscription,
wrong-password, stale-session, active-subscription block, owner handover, ordinary member removal, JSON
export before deletion, and inability to sign in after deletion. Never use a real customer account for
this test.
