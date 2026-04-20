grant select on wrestling.team_locations to authenticated;
alter table wrestling.team_locations enable row level security;
drop policy if exists "Authenticated users can read team locations"
on wrestling.team_locations;
create policy "Authenticated users can read team locations"
on wrestling.team_locations
for select
to authenticated
using (true);
