create table public.savepixie_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  dream_category text,
  source text not null default 'savepixie-landing',
  utm_medium text,
  utm_campaign text,
  landing_variant text not null default 'dream-habit-v1',
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  status text not null default 'waiting',
  constraint savepixie_waitlist_email_normalized
    check (email = lower(btrim(email))),
  constraint savepixie_waitlist_email_length
    check (char_length(email) between 5 and 254),
  constraint savepixie_waitlist_email_shape
    check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint savepixie_waitlist_dream_category
    check (dream_category is null or dream_category in ('travel', 'safety', 'home', 'something')),
  constraint savepixie_waitlist_source_length
    check (char_length(source) between 1 and 120),
  constraint savepixie_waitlist_utm_medium_length
    check (utm_medium is null or char_length(utm_medium) between 1 and 120),
  constraint savepixie_waitlist_utm_campaign_length
    check (utm_campaign is null or char_length(utm_campaign) between 1 and 120),
  constraint savepixie_waitlist_variant_length
    check (char_length(landing_variant) between 1 and 80),
  constraint savepixie_waitlist_status
    check (status in ('waiting', 'invited', 'joined', 'unsubscribed'))
);

create unique index savepixie_waitlist_email_unique
  on public.savepixie_waitlist (email);

alter table public.savepixie_waitlist enable row level security;

revoke all on table public.savepixie_waitlist from anon, authenticated;
grant insert (email, dream_category, source, utm_medium, utm_campaign, landing_variant)
  on table public.savepixie_waitlist to anon, authenticated;

create policy "Public visitors can join the SavePixie waitlist"
  on public.savepixie_waitlist
  for insert
  to anon, authenticated
  with check (
    status = 'waiting'
    and consent_at <= now()
    and consent_at > now() - interval '5 minutes'
    and created_at <= now()
    and created_at > now() - interval '5 minutes'
  );

comment on table public.savepixie_waitlist is
  'Private SavePixie early-access signups. Browser roles may insert but can never list, read, update, or delete entries.';
