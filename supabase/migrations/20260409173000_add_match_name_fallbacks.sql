alter table wrestling.matches
  add column if not exists winner_name text,
  add column if not exists loser_name text;
update wrestling.matches
set winner_name = winner_profile.full_name
from wrestling.profiles as winner_profile
where winner_profile.id = wrestling.matches.winner_id
  and (wrestling.matches.winner_name is null or btrim(wrestling.matches.winner_name) = '');
update wrestling.matches
set loser_name = loser_profile.full_name
from wrestling.profiles as loser_profile
where loser_profile.id = wrestling.matches.loser_id
  and (wrestling.matches.loser_name is null or btrim(wrestling.matches.loser_name) = '');
create index if not exists matches_winner_name_idx on wrestling.matches (winner_name);
create index if not exists matches_loser_name_idx on wrestling.matches (loser_name);
