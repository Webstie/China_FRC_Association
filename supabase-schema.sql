create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.page_events (
  id uuid primary key,
  site_id text not null default 'frc-wiki-cn',
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  full_path text,
  title text,
  referrer text,
  entered_at timestamptz not null,
  left_at timestamptz,
  duration_ms integer not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.page_events enable row level security;

revoke insert, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, last_login_at) on public.profiles to authenticated;
grant update (email, last_login_at) on public.profiles to authenticated;

grant insert on public.page_events to authenticated;
grant select on public.page_events to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, last_login_at)
  values (new.id, new.email, now())
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_profile_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, last_login_at)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), now())
  on conflict (id) do update
  set
    email = excluded.email,
    last_login_at = excluded.last_login_at;
end;
$$;

grant execute on function public.touch_profile_login() to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update own login timestamp" on public.profiles;
create policy "Users can update own login timestamp"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Users can insert own page events" on public.page_events;
create policy "Users can insert own page events"
on public.page_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins can read page events" on public.page_events;
create policy "Admins can read page events"
on public.page_events
for select
to authenticated
using (public.is_admin());

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists page_events_user_id_idx on public.page_events(user_id);
create index if not exists page_events_path_idx on public.page_events(path);
create index if not exists page_events_entered_at_idx on public.page_events(entered_at desc);
