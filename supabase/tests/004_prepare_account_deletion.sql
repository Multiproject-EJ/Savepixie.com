begin;

do $$
declare
  owner_id uuid := gen_random_uuid();
  successor_id uuid := gen_random_uuid();
  third_member_id uuid := gen_random_uuid();
  shared_pact_id uuid := gen_random_uuid();
  owner_home_id uuid := gen_random_uuid();
  successor_home_id uuid := gen_random_uuid();
  transferred integer;
  pact_owner uuid;
  owner_role text;
  successor_role text;
  reported_total bigint;
  owner_entry_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
  values
    (owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'deletion-owner@example.invalid', crypt('test-password', gen_salt('bf')), now()),
    (successor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'deletion-successor@example.invalid', crypt('test-password', gen_salt('bf')), now()),
    (third_member_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'deletion-third@example.invalid', crypt('test-password', gen_salt('bf')), now());

  insert into public.savings_homes (id, user_id, label, reported_balance_cents)
  values
    (owner_home_id, owner_id, 'Owner home', 10000),
    (successor_home_id, successor_id, 'Successor home', 10000);

  insert into public.savings_pacts (id, created_by, mode, name, target_cents)
  values (shared_pact_id, owner_id, 'shared', 'Deletion handover', 20000);

  -- This fixture intentionally needs a three-person Circle to prove deterministic
  -- ownership handover, so its owner is a Pro subscriber for the test.
  insert into public.entitlements (
    user_id, product_key, plan, has_pro_access, subscription_status
  ) values (
    owner_id, 'savepixie', 'pro', true, 'trialing'
  );

  insert into public.savings_pact_members (
    pact_id, user_id, role, display_name, privacy_mode, joined_at
  ) values
    (shared_pact_id, owner_id, 'owner', 'Owner', 'exact', now() - interval '3 days'),
    (shared_pact_id, successor_id, 'member', 'Successor', 'exact', now() - interval '2 days'),
    (shared_pact_id, third_member_id, 'member', 'Third', 'exact', now() - interval '1 day');

  insert into public.savings_pact_entries (
    id, pact_id, member_user_id, savings_home_id, entry_type, delta_cents
  ) values
    (owner_entry_id, shared_pact_id, owner_id, owner_home_id, 'pending', 3000),
    (gen_random_uuid(), shared_pact_id, successor_id, successor_home_id, 'pending', 2000);

  insert into public.savings_pact_activity_cheers (activity_id, user_id)
  values (owner_entry_id, successor_id);

  insert into public.daily_saver_progress (
    user_id, current_streak, best_streak, stardust_total, completed_moves, last_completed_on
  ) values (owner_id, 2, 2, 60, 2, current_date);

  insert into public.daily_move_completions (
    user_id, local_date, move_id, completion_kind, pact_id, saved_cents,
    stardust_awarded, reflection
  ) values (
    owner_id, current_date, 'swap-and-save', 'save', shared_pact_id, 3000, 35,
    'A useful saving choice.'
  );

  select public.prepare_savepixie_account_deletion(owner_id) into transferred;

  if transferred <> 1 then
    raise exception 'Expected one ownership transfer, got %.', transferred;
  end if;

  select created_by, reported_cents
    into pact_owner, reported_total
  from public.savings_pacts
  where id = shared_pact_id;

  select role into owner_role
  from public.savings_pact_members
  where pact_id = shared_pact_id and user_id = owner_id;

  select role into successor_role
  from public.savings_pact_members
  where pact_id = shared_pact_id and user_id = successor_id;

  if pact_owner <> successor_id or owner_role <> 'member' or successor_role <> 'owner' then
    raise exception 'Pact ownership was not transferred consistently.';
  end if;

  if reported_total <> 2000 then
    raise exception 'Departing member progress was not removed; total is %.', reported_total;
  end if;

  delete from auth.users where id = owner_id;

  if not exists (select 1 from public.savings_pacts where id = shared_pact_id) then
    raise exception 'Shared Pact disappeared after its former owner was deleted.';
  end if;

  if exists (
    select 1 from public.savings_pact_entries
    where pact_id = shared_pact_id and member_user_id = owner_id
  ) then
    raise exception 'Deleted member entries survived the account deletion.';
  end if;

  if exists (
    select 1 from public.savings_pact_activity_cheers where activity_id = owner_entry_id
  ) then
    raise exception 'A cheer survived after its deleted activity was removed.';
  end if;

  if exists (
    select 1 from public.daily_saver_progress where user_id = owner_id
  ) or exists (
    select 1 from public.daily_move_completions where user_id = owner_id
  ) then
    raise exception 'Deleted member daily-loop data survived the account deletion.';
  end if;

  if not exists (
    select 1 from public.savings_pact_entries
    where pact_id = shared_pact_id and member_user_id = successor_id
  ) then
    raise exception 'Remaining member history was removed unexpectedly.';
  end if;
end;
$$;

rollback;
