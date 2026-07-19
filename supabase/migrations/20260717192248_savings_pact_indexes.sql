-- Cover every Savings Pact foreign key reported by the database advisor.

create index savings_pact_invites_created_by_idx
  on private.savings_pact_invites(created_by);

create index savings_pact_invites_pact_id_idx
  on private.savings_pact_invites(pact_id);

create index savings_pact_entries_pact_member_idx
  on public.savings_pact_entries(pact_id, member_user_id);

create index savings_pact_entries_home_member_idx
  on public.savings_pact_entries(savings_home_id, member_user_id)
  where savings_home_id is not null;

create index savings_pact_entries_source_entry_idx
  on public.savings_pact_entries(source_entry_id)
  where source_entry_id is not null;
