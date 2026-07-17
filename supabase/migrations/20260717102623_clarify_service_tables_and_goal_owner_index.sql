-- Make the service-only billing policy explicit and cover the composite
-- goal ownership foreign key used by deposit validation.

create index if not exists goal_events_goal_id_user_id_idx
on public.goal_events (goal_id, user_id);

drop policy if exists billing_customers_service_all
on public.billing_customers;

create policy billing_customers_service_all
on public.billing_customers
for all
to service_role
using (true)
with check (true);

drop policy if exists stripe_webhook_events_service_all
on public.stripe_webhook_events;

create policy stripe_webhook_events_service_all
on public.stripe_webhook_events
for all
to service_role
using (true)
with check (true);
