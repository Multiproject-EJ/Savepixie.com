-- Let customers include their own reaction records in a private account export
-- without exposing who else cheered an activity.

drop policy if exists savings_pact_activity_cheers_select_own
on public.savings_pact_activity_cheers;

create policy savings_pact_activity_cheers_select_own
on public.savings_pact_activity_cheers
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on table public.savings_pact_activity_cheers to authenticated;
