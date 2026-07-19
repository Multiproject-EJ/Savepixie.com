-- Keep an active entitlement when Stripe delivers a terminal event for a
-- different, obsolete subscription belonging to the same user and product.
-- Events for the subscription currently represented by the entitlement still
-- update it normally, including cancellation.

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
      updated_at = now()
  where pro_is_active
     or public.entitlements.stripe_subscription_id is null
     or public.entitlements.stripe_subscription_id = excluded.stripe_subscription_id
     or public.entitlements.subscription_status not in ('active', 'trialing');

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
