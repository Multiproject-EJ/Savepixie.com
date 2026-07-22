-- Treat repeat signups as a successful no-op so the public endpoint does not
-- reveal whether an email address is already on the private waitlist.

create or replace function private.mask_duplicate_savepixie_waitlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.savepixie_waitlist as waitlist
    where waitlist.email = new.email
  ) then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function private.mask_duplicate_savepixie_waitlist()
  from public, anon, authenticated;

create trigger mask_duplicate_savepixie_waitlist_before_insert
  before insert on public.savepixie_waitlist
  for each row
  execute function private.mask_duplicate_savepixie_waitlist();

comment on function private.mask_duplicate_savepixie_waitlist() is
  'Silently ignores repeat SavePixie waitlist emails to prevent public email enumeration.';
