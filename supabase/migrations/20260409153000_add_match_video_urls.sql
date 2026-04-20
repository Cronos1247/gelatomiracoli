alter table wrestling.matches
add column if not exists match_video_url text;
drop policy if exists "Claimed athletes can update their own match videos" on wrestling.matches;
create policy "Claimed athletes can update their own match videos"
on wrestling.matches
for update
to authenticated
using (
  exists (
    select 1
    from wrestling.profiles winner_profile
    where winner_profile.id = wrestling.matches.winner_id
      and winner_profile.user_id = auth.uid()
  )
  or exists (
    select 1
    from wrestling.profiles loser_profile
    where loser_profile.id = wrestling.matches.loser_id
      and loser_profile.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from wrestling.profiles winner_profile
    where winner_profile.id = wrestling.matches.winner_id
      and winner_profile.user_id = auth.uid()
  )
  or exists (
    select 1
    from wrestling.profiles loser_profile
    where loser_profile.id = wrestling.matches.loser_id
      and loser_profile.user_id = auth.uid()
  )
);
grant update (match_video_url) on wrestling.matches to authenticated;
grant update (match_video_url) on wrestling.matches to service_role;
