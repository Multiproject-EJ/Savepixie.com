-- A Savings Home belongs to exactly one user. Its linked ledger entries must be
-- removed with it during account deletion; otherwise PostgreSQL can process the
-- Home cascade before the membership cascade and reject the Auth user deletion.

alter table public.savings_pact_entries
  drop constraint savings_pact_entries_savings_home_id_member_user_id_fkey;

alter table public.savings_pact_entries
  add constraint savings_pact_entries_savings_home_id_member_user_id_fkey
  foreign key (savings_home_id, member_user_id)
  references public.savings_homes(id, user_id)
  on delete cascade;
