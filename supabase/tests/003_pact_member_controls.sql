begin;

insert into auth.users (id, email)
values
  ('55555555-5555-4555-8555-555555555555', 'circle-owner@example.invalid'),
  ('66666666-6666-4666-8666-666666666666', 'circle-member@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'circle-outsider@example.invalid');

insert into public.profiles (id, display_name)
values
  ('55555555-5555-4555-8555-555555555555', 'Owner'),
  ('66666666-6666-4666-8666-666666666666', 'Member'),
  ('77777777-7777-4777-8777-777777777777', 'Outsider');

set local role authenticated;

create temp table member_control_test_state (
  shared_pact uuid,
  invite_token uuid,
  member_home uuid
);

grant select on member_control_test_state to service_role;

insert into member_control_test_state default values;

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);

update member_control_test_state
set shared_pact = (
  select (public.create_savings_pact(
    'shared', 'Privacy Pact', 100000, '◎', '#7b3fff', null, 'equal', 'exact'
  )).id
);

update public.savings_pact_members
set commitment_cents = 50000
where pact_id = (select shared_pact from member_control_test_state)
  and user_id = '55555555-5555-4555-8555-555555555555';

update member_control_test_state
set invite_token = public.create_savings_pact_invite(shared_pact);

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);

select public.join_savings_pact(invite_token)
from member_control_test_state;

do $$
begin
  begin
    update public.savings_pact_members
    set role = 'owner'
    where pact_id = (select shared_pact from member_control_test_state)
      and user_id = '66666666-6666-4666-8666-666666666666';
    raise exception 'A member unexpectedly promoted themselves to Pact owner.';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    update public.savings_pact_members
    set pact_id = gen_random_uuid()
    where pact_id = (select shared_pact from member_control_test_state)
      and user_id = '66666666-6666-4666-8666-666666666666';
    raise exception 'A member unexpectedly reassigned their membership to another Pact.';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

with created as (
  insert into public.savings_homes (user_id, label, reported_balance_cents)
  values (
    '66666666-6666-4666-8666-666666666666',
    'Member Savings Home',
    50000
  )
  returning id
)
update member_control_test_state
set member_home = created.id
from created;

update public.savings_pact_members
set commitment_cents = 20000,
    privacy_mode = 'on_track_only'
where pact_id = (select shared_pact from member_control_test_state)
  and user_id = '66666666-6666-4666-8666-666666666666';

select public.record_pending_pact_save(
  shared_pact,
  member_home,
  5000,
  'Private pending save'
)
from member_control_test_state;

do $$
begin
  if (select count(*) from public.savings_pact_members) <> 1 then
    raise exception 'A member should directly see only their own membership row.';
  end if;

  if (
    select count(*)
    from public.get_savings_pact_members(
      (select shared_pact from member_control_test_state)
    )
  ) <> 2 then
    raise exception 'The filtered Circle summary should include both active members.';
  end if;

  if not (
    select amount_visible
    from public.get_savings_pact_members(
      (select shared_pact from member_control_test_state)
    )
    where user_id = '66666666-6666-4666-8666-666666666666'
  ) then
    raise exception 'A member must be able to see their own amount.';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);

do $$
begin
  if exists (
    select 1
    from public.savings_pact_members
    where user_id = '66666666-6666-4666-8666-666666666666'
  ) then
    raise exception 'The owner can bypass the filtered RPC through a direct member-table read.';
  end if;

  if (
    select commitment_cents is not null
      or reported_cents is not null
      or amount_visible
      or on_track is distinct from false
    from public.get_savings_pact_members(
      (select shared_pact from member_control_test_state)
    )
    where user_id = '66666666-6666-4666-8666-666666666666'
  ) then
    raise exception 'On-track-only privacy leaked an exact member amount or wrong status.';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);

update public.savings_pact_members
set privacy_mode = 'organizer_only'
where pact_id = (select shared_pact from member_control_test_state)
  and user_id = '66666666-6666-4666-8666-666666666666';

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);

do $$
begin
  if (
    select commitment_cents
    from public.get_savings_pact_members(
      (select shared_pact from member_control_test_state)
    )
    where user_id = '66666666-6666-4666-8666-666666666666'
  ) <> 20000 then
    raise exception 'Organizer-only privacy did not reveal the commitment to the owner.';
  end if;

  begin
    perform public.leave_savings_pact(
      (select shared_pact from member_control_test_state)
    );
    raise exception 'The Pact owner unexpectedly left their own Pact.';
  exception
    when invalid_parameter_value then
      null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.get_savings_pact_members(
      (select shared_pact from member_control_test_state)
    );
    raise exception 'An outsider unexpectedly opened the Circle summary.';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);

select public.leave_savings_pact(shared_pact)
from member_control_test_state;

do $$
begin
  if (select count(*) from public.savings_pacts) <> 0 then
    raise exception 'A member who left can still read the Pact.';
  end if;
end
$$;

select public.join_savings_pact(invite_token)
from member_control_test_state;

do $$
begin
  if (select count(*) from public.savings_pacts) <> 1 then
    raise exception 'A valid new acceptance did not reactivate the member.';
  end if;

  if (
    select count(*)
    from public.get_savings_pact_members(
      (select shared_pact from member_control_test_state)
    )
  ) <> 2 then
    raise exception 'The reactivated member did not return to the Circle summary.';
  end if;
end
$$;

reset role;
rollback;
