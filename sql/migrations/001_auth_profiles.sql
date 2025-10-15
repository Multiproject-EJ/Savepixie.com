create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );
