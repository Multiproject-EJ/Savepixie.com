-- Stripe remains the billing authority. These tables hold only the minimum
-- customer mapping, verified entitlement summary, and webhook idempotency log.

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null
    check (product_key in ('savepixie', 'wallethabit')),
  plan text not null default 'free' check (plan in ('free', 'pro')),
  has_pro_access boolean not null default false,
  subscription_status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_key)
);

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists entitlements_product_key_idx
on public.entitlements (product_key);
create index if not exists entitlements_stripe_customer_id_idx
on public.entitlements (stripe_customer_id);

alter table public.billing_customers enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists entitlements_select_own on public.entitlements;

create policy entitlements_select_own
on public.entitlements
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on table
  public.billing_customers,
  public.entitlements,
  public.stripe_webhook_events
from anon, authenticated;

grant select on table public.entitlements to authenticated;

grant select, insert, update, delete on table
  public.billing_customers,
  public.entitlements,
  public.stripe_webhook_events
to service_role;

-- The Stripe webhook calls this RPC with the service role. The event marker
-- and entitlement update succeed or roll back together, so a retry can never
-- be incorrectly treated as already processed after a partial failure.
create or replace function public.process_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_product_key text,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_trial_ends_at timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
  pro_is_active boolean := p_status in ('active', 'trialing');
begin
  if p_product_key not in ('savepixie', 'wallethabit') then
    raise exception 'Unknown product key.' using errcode = '22023';
  end if;

  insert into public.stripe_webhook_events (stripe_event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (stripe_event_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    return false;
  end if;

  insert into public.billing_customers (user_id, stripe_customer_id, updated_at)
  values (p_user_id, p_customer_id, now())
  on conflict (user_id) do update
  set stripe_customer_id = excluded.stripe_customer_id,
      updated_at = now();

  insert into public.entitlements (
    user_id,
    product_key,
    plan,
    has_pro_access,
    subscription_status,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    trial_ends_at,
    current_period_end,
    cancel_at,
    updated_at
  )
  values (
    p_user_id,
    p_product_key,
    case when pro_is_active then 'pro' else 'free' end,
    pro_is_active,
    p_status,
    p_customer_id,
    p_subscription_id,
    p_price_id,
    p_trial_ends_at,
    p_current_period_end,
    p_cancel_at,
    now()
  )
  on conflict (user_id, product_key) do update
  set plan = excluded.plan,
      has_pro_access = excluded.has_pro_access,
      subscription_status = excluded.subscription_status,
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      stripe_price_id = excluded.stripe_price_id,
      trial_ends_at = excluded.trial_ends_at,
      current_period_end = excluded.current_period_end,
      cancel_at = excluded.cancel_at,
      updated_at = now();

  return true;
end;
$$;

revoke all on function public.process_stripe_subscription_event(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute on function public.process_stripe_subscription_event(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz
)
to service_role;

notify pgrst, 'reload schema';
