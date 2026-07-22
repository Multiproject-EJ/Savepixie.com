begin;

set local role anon;

insert into public.savepixie_waitlist (
  email,
  dream_category,
  source,
  landing_variant
)
values (
  'waitlist-test@savepixie.invalid',
  'travel',
  'database-test',
  'dream-habit-v1'
);

-- A duplicate public submission should be a successful no-op, not an email
-- enumeration signal.
insert into public.savepixie_waitlist (
  email,
  dream_category,
  source,
  landing_variant
)
values (
  'waitlist-test@savepixie.invalid',
  'home',
  'database-test',
  'dream-habit-v1'
);

do $$
begin
  begin
    perform count(*) from public.savepixie_waitlist;
    raise exception 'An anonymous visitor unexpectedly read the waitlist.';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    insert into public.savepixie_waitlist (email, status)
    values ('waitlist-status-test@savepixie.invalid', 'invited');
    raise exception 'An anonymous visitor unexpectedly set an internal waitlist status.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from public.savepixie_waitlist
    where email = 'waitlist-test@savepixie.invalid'
  ) <> 1 then
    raise exception 'Duplicate public waitlist submissions created multiple rows.';
  end if;

  if has_function_privilege(
    'anon',
    'private.mask_duplicate_savepixie_waitlist()',
    'execute'
  ) then
    raise exception 'The duplicate-masking trigger function is directly callable by anon.';
  end if;
end;
$$;

rollback;
