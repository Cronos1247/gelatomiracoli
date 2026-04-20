drop policy if exists "Public read access for profiles" on wrestling.profiles;
drop policy if exists "Public read access for tournaments" on wrestling.tournaments;
drop policy if exists "Public read access for matches" on wrestling.matches;
drop policy if exists "Users can update their claimed profile" on wrestling.profiles;
create policy "Public read access for profiles"
on wrestling.profiles
for select
to anon, authenticated
using (true);
create policy "Public read access for tournaments"
on wrestling.tournaments
for select
to anon, authenticated
using (true);
create policy "Public read access for matches"
on wrestling.matches
for select
to anon, authenticated
using (true);
create policy "Users can update their claimed profile"
on wrestling.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
