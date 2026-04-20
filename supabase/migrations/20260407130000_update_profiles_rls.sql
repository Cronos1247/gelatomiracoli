drop policy if exists "Users can update their claimed profile" on wrestling.profiles;
drop policy if exists "Users can claim or update their own profile" on wrestling.profiles;
create policy "Users can claim or update their own profile"
on wrestling.profiles
for update
to authenticated
using (user_id is null or auth.uid() = user_id)
with check (auth.uid() = user_id);
