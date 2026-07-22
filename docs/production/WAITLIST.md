# SavePixie waitlist operations

The public landing page stores early-access interest in `public.savepixie_waitlist` in the shared
WalletHabit Suite Supabase project.

## What is recorded

- normalized email address;
- optional broad dream category;
- consent and creation timestamps;
- landing-page variant;
- limited source, medium, and campaign labels.

No IP address, bank information, account data, or full referrer URL is stored by the waitlist.

## Access model

Anonymous and authenticated browser clients may insert only the public signup fields. Row-level
security is enabled. Browser roles cannot select, list, update, delete, or set internal status fields.
Operational access remains server-side through trusted Supabase tooling. Repeat emails are silently
ignored, so the public form cannot be used to discover whether someone is already on the list.

## Reading early demand

The first useful signals are:

1. total legitimate signups;
2. signups per day and campaign source;
3. the share of selected dream categories;
4. repeat or duplicate submissions;
5. later, landing-page conversion rate after privacy-friendly visit analytics are enabled.

Example operator query:

```sql
select
  date_trunc('day', created_at) as signup_day,
  source,
  dream_category,
  count(*) as signups
from public.savepixie_waitlist
where status = 'waiting'
group by 1, 2, 3
order by 1 desc, 4 desc;
```

Signup count alone measures demand, not conversion quality. Before driving paid traffic, add a
privacy-friendly visit counter so signups can be divided by unique landing visits per campaign.

## Removal and status

Until automated unsubscribe handling exists, removal requests go to `support@savepixie.com`.
Prefer setting `status = 'unsubscribed'` for a consent withdrawal, then remove the email according to
the final retention policy. Never export the list to personal files or use it for unrelated marketing.
