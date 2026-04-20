create table if not exists wrestling.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null references wrestling.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, athlete_id)
);
alter table wrestling.user_favorites enable row level security;
drop policy if exists "Users can view their own favorites" on wrestling.user_favorites;
create policy "Users can view their own favorites"
on wrestling.user_favorites
for select
to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users can insert their own favorites" on wrestling.user_favorites;
create policy "Users can insert their own favorites"
on wrestling.user_favorites
for insert
to authenticated
with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own favorites" on wrestling.user_favorites;
create policy "Users can delete their own favorites"
on wrestling.user_favorites
for delete
to authenticated
using (auth.uid() = user_id);
grant select, insert, delete on wrestling.user_favorites to authenticated;
