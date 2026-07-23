-- Keep each saver's chosen Pixie in their protected profile so the same
-- identity and colour theme follows them across the PWA, website and devices.

alter table public.profiles
  add column if not exists pixie_theme text not null default 'tide';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_pixie_theme_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_pixie_theme_allowed
      check (pixie_theme in ('tide', 'ember', 'grove', 'nova', 'moon', 'aurora'));
  end if;
end;
$$;

grant insert (pixie_theme) on public.profiles to authenticated;
grant update (pixie_theme) on public.profiles to authenticated;

comment on column public.profiles.pixie_theme is
  'The saver-selected SavePixie identity. It controls mascot appearance and the shared app/website theme.';

notify pgrst, 'reload schema';
