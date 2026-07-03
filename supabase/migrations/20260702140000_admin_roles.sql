-- Admin role mechanism. RLS is strictly per-owner everywhere, so admin data
-- access goes through the service-role `admin-api` edge function; this table
-- is what that function (and the client-side guard) checks.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Users may see their OWN role (drives the client-side guard + sidebar link);
-- writes are service-role only.
drop policy if exists "read own role" on public.user_roles;
create policy "read own role" on public.user_roles
  for select using (auth.uid() = user_id);

create or replace function public.has_role(uid uuid, r text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = r);
$$;

-- Seed the owner account.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = 'darien.cepani42@gmail.com'
on conflict (user_id) do nothing;
