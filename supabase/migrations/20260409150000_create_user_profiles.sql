create table if not exists wrestling.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table wrestling.user_profiles enable row level security;
grant select, insert, update on wrestling.user_profiles to authenticated;
grant select, insert, update, delete on wrestling.user_profiles to service_role;
drop policy if exists "Users can view their own account profile" on wrestling.user_profiles;
create policy "Users can view their own account profile"
on wrestling.user_profiles
for select
to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users can insert their own account profile" on wrestling.user_profiles;
create policy "Users can insert their own account profile"
on wrestling.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);
drop policy if exists "Users can update their own account profile" on wrestling.user_profiles;
create policy "Users can update their own account profile"
on wrestling.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
