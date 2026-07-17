begin;

do $$
declare
  owner_id uuid := gen_random_uuid();
  first_member_id uuid := gen_random_uuid();
  second_member_id uuid := gen_random_uuid();
  first_pact_id uuid;
  second_pact_id uuid;
  extra_user_id uuid;
  extra_index integer;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
  values
    (owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'pro-owner@example.invalid', crypt('test-password', gen_salt('bf')), now()),
    (first_member_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'pro-member-one@example.invalid', crypt('test-password', gen_salt('bf')), now()),
    (second_member_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'pro-member-two@example.invalid', crypt('test-password', gen_salt('bf')), now());

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  );

  select (public.create_savings_pact('shared', 'Basic Circle', 50000)).id
    into first_pact_id;

  begin
    perform public.create_savings_pact('shared', 'Second Basic Circle', 50000);
    raise exception 'Basic owner unexpectedly created a second active shared Pact.';
  exception
    when sqlstate 'P0001' then null;
  end;

  insert into public.savings_pact_members (
    pact_id, user_id, role, display_name, privacy_mode
  ) values (
    first_pact_id, first_member_id, 'member', 'First member', 'on_track_only'
  );

  begin
    insert into public.savings_pact_members (
      pact_id, user_id, role, display_name, privacy_mode
    ) values (
      first_pact_id, second_member_id, 'member', 'Second member', 'on_track_only'
    );
    raise exception 'Basic Circle unexpectedly accepted a third active saver.';
  exception
    when sqlstate 'P0001' then null;
  end;

  insert into public.entitlements (
    user_id, product_key, plan, has_pro_access, subscription_status
  ) values (
    owner_id, 'savepixie', 'pro', true, 'trialing'
  );

  select (public.create_savings_pact('shared', 'Pro Circle', 80000)).id
    into second_pact_id;

  if second_pact_id is null then
    raise exception 'Pro owner could not create an additional shared Pact.';
  end if;

  begin
    insert into public.savings_pact_members (
      pact_id, user_id, role, display_name, privacy_mode
    ) values (
      second_pact_id, first_member_id, 'member', 'First member', 'on_track_only'
    );
    raise exception 'Basic member unexpectedly joined a second active shared Pact.';
  exception
    when sqlstate 'P0001' then null;
  end;

  insert into public.entitlements (
    user_id, product_key, plan, has_pro_access, subscription_status
  ) values (
    first_member_id, 'savepixie', 'pro', true, 'active'
  );

  insert into public.savings_pact_members (
    pact_id, user_id, role, display_name, privacy_mode
  ) values (
    second_pact_id, first_member_id, 'member', 'First member', 'on_track_only'
  );

  insert into public.savings_pact_members (
    pact_id, user_id, role, display_name, privacy_mode
  ) values (
    first_pact_id, second_member_id, 'member', 'Second member', 'on_track_only'
  );

  for extra_index in 1..8 loop
    extra_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at
    ) values (
      extra_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      format('pro-circle-%s@example.invalid', extra_index),
      crypt('test-password', gen_salt('bf')),
      now()
    );

    if extra_index <= 7 then
      insert into public.savings_pact_members (
        pact_id, user_id, role, display_name, privacy_mode
      ) values (
        first_pact_id,
        extra_user_id,
        'member',
        format('Extra member %s', extra_index),
        'on_track_only'
      );
    else
      begin
        insert into public.savings_pact_members (
          pact_id, user_id, role, display_name, privacy_mode
        ) values (
          first_pact_id,
          extra_user_id,
          'member',
          'Eleventh saver',
          'on_track_only'
        );
        raise exception 'Pro Circle unexpectedly accepted an eleventh active saver.';
      exception
        when sqlstate 'P0001' then null;
      end;
    end if;
  end loop;

  update public.entitlements
  set plan = 'free',
      has_pro_access = false,
      subscription_status = 'canceled'
  where user_id = owner_id and product_key = 'savepixie';

  if (
    select count(*) from public.savings_pact_members
    where pact_id = first_pact_id and status = 'active'
  ) <> 10 then
    raise exception 'Ending Pro removed or hid an existing Circle member.';
  end if;
end;
$$;

rollback;
