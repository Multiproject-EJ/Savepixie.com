# SavePixie Beta Monitoring

Updated: 2026-07-18

Live function: `report-client-error` v1, active with platform JWT verification enabled. An anonymous
production-origin probe returns `401 UNAUTHORIZED_NO_AUTH_HEADER` before the handler runs.

## Privacy boundary

SavePixie uses Supabase's existing operational logs for the closed beta. The PWA reports only
authenticated, allow-listed failure codes to the `report-client-error` Edge Function. It does not
send free-text errors, stack traces, URLs, Pact IDs, email addresses, savings values, form content,
cookies, device identifiers, or customer metadata.

The browser sends each code at most once per page load and silently ignores reporting failures. The
function requires a valid Supabase user JWT, accepts requests only from approved SavePixie origins,
rejects bodies over 512 bytes, validates both fields against fixed allow-lists, and stores no separate
tracking table. Supabase's normal infrastructure request logs still apply and should be handled under
the operator's Supabase data-processing and retention terms.

## Error signals

Search Edge Function logs for `savepixie_client_error`. Each accepted line contains only:

- `event`: always `savepixie_client_error`;
- `code`: a fixed operational category;
- `surface`: `auth`, `app`, `saving`, `billing`, or `settings`.

Treat any `render_fatal`, `account_delete`, or repeated `save_action` event as a same-day beta
investigation. Compare the timestamp with Auth, API, Postgres, and the relevant Edge Function logs.
Do not ask customers to send passwords, bank screenshots, tokens, or full browser logs.

## Minimal conversion funnel without customer tracking

Run the following only as a trusted database operator. It returns aggregate counts and does not
export identifiers:

```sql
with saver_funnel as (
  select
    customer.id,
    customer.email_confirmed_at is not null as confirmed,
    exists (
      select 1 from public.savings_homes home
      where home.user_id = customer.id
    ) as has_savings_home,
    exists (
      select 1 from public.savings_pact_members member
      where member.user_id = customer.id and member.status = 'active'
    ) as has_pact,
    exists (
      select 1 from public.savings_pact_entries entry
      where entry.member_user_id = customer.id
        and entry.entry_type in ('pending', 'allocation')
        and entry.delta_cents > 0
    ) as has_first_save,
    exists (
      select 1 from public.entitlements entitlement
      where entitlement.user_id = customer.id
        and entitlement.product_key = 'savepixie'
        and entitlement.subscription_status in ('trialing', 'active')
    ) as has_subscription
  from auth.users customer
)
select
  count(*) as accounts,
  count(*) filter (where confirmed) as confirmed_accounts,
  count(*) filter (where has_savings_home and has_pact) as completed_core_onboarding,
  count(*) filter (where has_first_save) as recorded_first_save,
  count(*) filter (where has_subscription) as trialing_or_active_subscribers
from saver_funnel;
```

This deliberately derives the beta funnel from records SavePixie already needs to provide the
service. Do not add advertising pixels, fingerprinting, cross-site identifiers, or page-view tracking
for the initial beta.

## Routine

During the closed beta:

1. Review Auth and Edge Function warnings each morning.
2. Search `savepixie_client_error` after every beta report.
3. Run the aggregate funnel weekly.
4. Re-run Security Advisor after database or Auth changes.
5. Record incidents and fixes without copying customer identifiers into Git.
